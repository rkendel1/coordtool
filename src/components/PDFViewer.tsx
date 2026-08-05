import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Field, FieldType } from '../types/Field';
import { snapRectToGrid } from '../utils/grid';
import { isOverflowRisk } from '../utils/validation';
import { OCRWord, extractTextWithOCR, findNearbyLabel, labelToFieldName } from '../utils/ocr';
import { detectFieldRegions } from '../utils/fieldDetection';
import { displayLabelFromPdfFieldId, semanticKeyFromPdfFieldId } from '../utils/fieldNames';
import './PDFViewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const SCALE = 1.5;

const TYPE_COLORS: Record<FieldType, string> = {
  text: 'rgba(74, 144, 217, 0.35)',
  multiline: 'rgba(80, 200, 120, 0.35)',
  checkbox: 'rgba(255, 160, 60, 0.35)',
  date: 'rgba(160, 100, 220, 0.35)',
  dob: 'rgba(140, 110, 200, 0.35)',
  currency: 'rgba(240, 80, 80, 0.35)',
  phone: 'rgba(60, 170, 155, 0.35)',
  ssn: 'rgba(108, 117, 125, 0.35)',
  ein: 'rgba(95, 108, 175, 0.35)',
  zip: 'rgba(61, 126, 166, 0.35)',
  signature: 'rgba(138, 109, 59, 0.35)',
  initials: 'rgba(155, 89, 182, 0.35)',
  table: 'rgba(30, 200, 200, 0.35)',
};

const TYPE_STROKE: Record<FieldType, string> = {
  text: '#4a90d9',
  multiline: '#32a85c',
  checkbox: '#e08020',
  date: '#8040c0',
  dob: '#6d4ea6',
  currency: '#d04040',
  phone: '#2c9c8a',
  ssn: '#6c757d',
  ein: '#5f6caf',
  zip: '#3d7ea6',
  signature: '#8a6d3b',
  initials: '#9b59b6',
  table: '#10a0a0',
};

function toSemanticKeyFromFieldId(fieldId: string): string {
  return semanticKeyFromPdfFieldId(fieldId);
}

function toDisplayLabelFromFieldId(fieldId: string): string {
  return displayLabelFromPdfFieldId(fieldId);
}

interface DrawRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface NativeDetectionResult {
  count: number;
  regions: Array<{ x: number; y: number; width: number; height: number }>;
}

async function extractEmbeddedPdfWords(
  page: pdfjsLib.PDFPageProxy,
  viewport: pdfjsLib.PageViewport
): Promise<OCRWord[]> {
  const content = await page.getTextContent();
  return content.items.flatMap((rawItem: any) => {
    const text = typeof rawItem.str === 'string' ? rawItem.str.trim() : '';
    if (!text || !rawItem.transform) return [];
    const [x, baselineY] = viewport.convertToViewportPoint(
      rawItem.transform[4], rawItem.transform[5]
    );
    const height = Math.max(1, Math.abs(rawItem.height || rawItem.transform[3] || 8) * viewport.scale);
    return [{
      text,
      x,
      y: baselineY - height,
      width: Math.max(1, Math.abs(rawItem.width || 1) * viewport.scale),
      height,
      confidence: 100,
    }];
  });
}

function overlapsExistingRegion(
  candidate: { x: number; y: number; width: number; height: number },
  regions: NativeDetectionResult['regions']
): boolean {
  return regions.some((region) => {
    const intersectionWidth = Math.max(0,
      Math.min(candidate.x + candidate.width, region.x + region.width) - Math.max(candidate.x, region.x));
    const intersectionHeight = Math.max(0,
      Math.min(candidate.y + candidate.height, region.y + region.height) - Math.max(candidate.y, region.y));
    const intersection = intersectionWidth * intersectionHeight;
    const smallerArea = Math.min(candidate.width * candidate.height, region.width * region.height);
    return smallerArea > 0 && intersection / smallerArea >= 0.35;
  });
}

interface Props {
  file: File;
  fields: Field[];
  selectedId: string | null;
  debugMode: boolean;
  showFieldOverlays: boolean;
  defaultType: FieldType;
  currentPage: number;
  totalPages: number;
  gridSize: number;
  enableOCR: boolean;
  enableAutoDetect: boolean;
  onPageChange: (page: number) => void;
  onFieldAdded: (field: Field) => void;
  onFieldSelected: (id: string) => void;
  onOCRProgress?: (progress: number) => void;
}

export const PDFViewer: React.FC<Props> = ({
  file,
  fields,
  selectedId,
  debugMode,
  showFieldOverlays,
  defaultType,
  currentPage,
  totalPages,
  gridSize,
  enableOCR,
  enableAutoDetect,
  onPageChange,
  onFieldAdded,
  onFieldSelected,
  onOCRProgress,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const viewportRef = useRef<pdfjsLib.PageViewport | null>(null);
  const pageRef = useRef<pdfjsLib.PDFPageProxy | null>(null);
  const [drawing, setDrawing] = useState<DrawRect | null>(null);
  const [ocrWords, setOcrWords] = useState<OCRWord[]>([]);
  const [ocrStatus, setOcrStatus] = useState('');
  const [shiftPressed, setShiftPressed] = useState(false);
  const isMouseDown = useRef(false);

  // Keyboard event listeners for Shift key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    file.arrayBuffer().then((buf) => {
      if (cancelled) return;
      pdfjsLib.getDocument({ data: buf }).promise.then((pdf) => {
        if (cancelled) return;
        pdfRef.current = pdf;
        renderPage(pdf, currentPage);
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Re-render page when page number changes or auto-detect toggles
  useEffect(() => {
    if (pdfRef.current) {
      renderPage(pdfRef.current, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, enableAutoDetect, enableOCR]);

  const renderPage = async (
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNum: number
  ) => {
    const page = await pdf.getPage(pageNum);
    pageRef.current = page;
    const viewport = page.getViewport({ scale: SCALE });
    viewportRef.current = viewport;

    const canvas = canvasRef.current!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const overlay = overlayRef.current!;
    overlay.width = viewport.width;
    overlay.height = viewport.height;

    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    
    // Auto-detect native widgets first, then printed/flattened form cells.
    const nativeDetection = (enableAutoDetect || enableOCR)
      ? await autoDetectFormFields(page, viewport, pageNum - 1)
      : { count: 0, regions: [] };
    if ((enableAutoDetect || enableOCR) && nativeDetection.count > 0) {
      setOcrStatus(`Found ${nativeDetection.count} native PDF fields`);
    }
    
    // Every auto-detect run is hybrid. Digital PDFs use their fast, precise
    // text layer; WASM OCR is a fallback only for image-only pages.
    if ((enableOCR || enableAutoDetect) && canvas) {
      try {
        setOcrStatus('Analyzing embedded PDF geometry…');
        let words = await extractEmbeddedPdfWords(page, viewport);
        let source = 'PDF geometry';
        if (words.length < 10) {
          setOcrStatus('Image-only page — analyzing with WASM OCR…');
          words = await extractTextWithOCR(canvas);
          source = 'WASM OCR';
        }
        setOcrWords(words);
        const detected = autoDetectFlatFields(
          canvas, viewport, pageNum - 1, words, nativeDetection.regions
        );
        setOcrStatus(nativeDetection.count > 0
          ? `Kept ${nativeDetection.count} native fields; added ${detected} from ${source}`
          : `Added ${detected} fields from ${source}`);
        if (onOCRProgress) onOCRProgress(100);
      } catch (err) {
        console.error('OCR failed:', err);
        setOcrWords([]);
        setOcrStatus('OCR failed — check the browser console for details');
      }
    } else if (nativeDetection.count === 0) {
      setOcrWords([]);
      setOcrStatus('');
    }
    
    drawOverlay();
  };

  const autoDetectFlatFields = (
    canvas: HTMLCanvasElement,
    viewport: pdfjsLib.PageViewport,
    pageIndex: number,
    words: OCRWord[],
    nativeRegions: NativeDetectionResult['regions'] = []
  ): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    const regions = detectFieldRegions(ctx.getImageData(0, 0, canvas.width, canvas.height), words);
    let added = 0;
    regions.forEach((region, index) => {
      const pdfX = region.x / SCALE;
      const pdfY = (viewport.height - region.y - region.height) / SCALE;
      const width = region.width / SCALE;
      const height = region.height / SCALE;
      if (overlapsExistingRegion({ x: pdfX, y: pdfY, width, height }, nativeRegions)) return;
      if (fields.some(f => f.page === pageIndex && Math.abs(f.x - pdfX) < 4 && Math.abs(f.y - pdfY) < 4)) return;
      const name = region.label || `detected_page${pageIndex + 1}_${index + 1}`;
      onFieldAdded({
        id: `flat-${pageIndex}-${Math.round(pdfX)}-${Math.round(pdfY)}`,
        name, sourceFieldId: name, semanticKey: toSemanticKeyFromFieldId(name),
        displayLabel: toDisplayLabelFromFieldId(name), page: pageIndex,
        x: pdfX, y: pdfY, width, height,
        type: region.kind === 'checkbox' || (width <= 18 && height <= 18)
          ? 'checkbox'
          : /date/i.test(name)
            ? 'date'
            : /premium|amount|limit|deposit/i.test(name)
              ? 'currency'
              : 'text',
        fontSize: 10, maxWidth: width,
        boxedTextEnabled: region.kind === 'boxedText',
        boxInputMode: region.kind === 'boxedText' ? 'alphanumeric' : undefined,
        boxPattern: region.kind === 'boxedText' ? String(region.boxCount || '') : undefined,
      });
      added++;
    });
    return added;
  };

  const autoDetectFormFields = async (
    page: pdfjsLib.PDFPageProxy,
    viewport: pdfjsLib.PageViewport,
    pageIndex: number
  ): Promise<NativeDetectionResult> => {
    try {
      const annotations = await page.getAnnotations();
      const formFields = annotations.filter((ann: any) => 
        ann.subtype === 'Widget' && ann.fieldType
      );
      const nativeRegions = formFields.map((ann: any) => {
        const [x1, y1, x2, y2] = ann.rect;
        return {
          x: Math.min(x1, x2), y: Math.min(y1, y2),
          width: Math.abs(x2 - x1), height: Math.abs(y2 - y1),
        };
      });
      
      for (const ann of formFields) {
        // Check if this field already exists (by approximate position)
        const exists = fields.some(f => 
          f.page === pageIndex &&
          Math.abs(f.x - ann.rect[0]) < 5 &&
          Math.abs(f.y - ann.rect[1]) < 5
        );
        
        if (exists) continue;
        
        // Convert annotation rect to our coordinate system
        const [x1, y1, x2, y2] = ann.rect;
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        
        let fieldType: FieldType = 'text';
        if (ann.fieldType === 'Tx') {
          fieldType = ann.multiLine ? 'multiline' : 'text';
        } else if (ann.fieldType === 'Btn') {
          fieldType = 'checkbox';
        }
        
        const fieldName = labelToFieldName(ann.fieldName || ann.alternativeText || '');
        
        const newField: Field = {
          id: `auto-${Date.now()}-${Math.random()}`,
          name: fieldName,
          sourceFieldId: fieldName,
          semanticKey: toSemanticKeyFromFieldId(fieldName),
          displayLabel: toDisplayLabelFromFieldId(fieldName),
          page: pageIndex,
          x: x1,
          y: y1,
          width,
          height,
          type: fieldType,
          fontSize: 10,
          maxWidth: width,
        };
        
        onFieldAdded(newField);
      }
      return { count: formFields.length, regions: nativeRegions };
    } catch (err) {
      console.error('Auto-detect failed:', err);
      return { count: 0, regions: [] };
    }
  };

  const drawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const viewport = viewportRef.current;
    if (!overlay || !viewport) return;

    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw saved fields
    for (const f of showFieldOverlays ? fields : []) {
      if (f.page !== currentPage - 1) continue;
      const canvasX = f.x * SCALE;
      const canvasY = viewport.height - (f.y + f.height) * SCALE;
      const canvasW = f.width * SCALE;
      const canvasH = f.height * SCALE;

      // Check for overflow risk
      const hasOverflow = debugMode && isOverflowRisk(f.type, f.maxWidth ?? f.width);
      
      ctx.fillStyle = hasOverflow ? 'rgba(255, 0, 0, 0.25)' : TYPE_COLORS[f.type];
      ctx.fillRect(canvasX, canvasY, canvasW, canvasH);

      ctx.strokeStyle = hasOverflow 
        ? '#ff0000' 
        : (f.id === selectedId ? '#ff4400' : TYPE_STROKE[f.type]);
      ctx.lineWidth = hasOverflow ? 2.5 : (f.id === selectedId ? 2.5 : 1.5);
      ctx.strokeRect(canvasX, canvasY, canvasW, canvasH);

      // Label
      ctx.save();
      ctx.beginPath();
      ctx.rect(canvasX, canvasY, canvasW, canvasH);
      ctx.clip();
      ctx.fillStyle = hasOverflow ? '#ff0000' : '#1a1a2e';
      ctx.font = hasOverflow ? 'bold 10px monospace' : '10px monospace';
      ctx.fillText(f.name || '(unnamed)', canvasX + 3, canvasY + 13);

      if (debugMode) {
        ctx.fillStyle = '#555';
        ctx.font = '9px monospace';
        ctx.fillText(
          `x:${Math.round(f.x)} y:${Math.round(f.y)} w:${Math.round(f.width)} h:${Math.round(f.height)}`,
          canvasX + 3,
          canvasY + canvasH - 3
        );
        
        if (hasOverflow) {
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('⚠ OVERFLOW RISK', canvasX + 3, canvasY + canvasH - 15);
        }
      }
      ctx.restore();
    }

    // Draw current drawing rect
    if (drawing) {
      const x = Math.min(drawing.startX, drawing.endX);
      const y = Math.min(drawing.startY, drawing.endY);
      const w = Math.abs(drawing.endX - drawing.startX);
      const h = Math.abs(drawing.endY - drawing.startY);
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }, [fields, currentPage, selectedId, debugMode, drawing, showFieldOverlays]);

  // Redraw overlay whenever fields/drawing change
  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (overlayRef.current!.width / rect.width),
      y: (e.clientY - rect.top) * (overlayRef.current!.height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const pos = getCanvasPos(e);

    // Check if clicking existing field
    const viewport = viewportRef.current;
    if (!viewport) return;

    for (const f of showFieldOverlays ? fields : []) {
      if (f.page !== currentPage - 1) continue;
      const canvasX = f.x * SCALE;
      const canvasY = viewport.height - (f.y + f.height) * SCALE;
      const canvasW = f.width * SCALE;
      const canvasH = f.height * SCALE;
      if (
        pos.x >= canvasX &&
        pos.x <= canvasX + canvasW &&
        pos.y >= canvasY &&
        pos.y <= canvasY + canvasH
      ) {
        onFieldSelected(f.id);
        return;
      }
    }

    isMouseDown.current = true;
    setDrawing({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown.current || !drawing) return;
    const pos = getCanvasPos(e);
    setDrawing((d) => d ? { ...d, endX: pos.x, endY: pos.y } : null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown.current || !drawing) return;
    isMouseDown.current = false;

    const viewport = viewportRef.current;
    if (!viewport) { setDrawing(null); return; }

    const x = Math.min(drawing.startX, drawing.endX);
    const y = Math.min(drawing.startY, drawing.endY);
    const w = Math.abs(drawing.endX - drawing.startX);
    const h = Math.abs(drawing.endY - drawing.startY);

    if (w < 5 || h < 5) { setDrawing(null); return; }

    // Convert top-left of rectangle to PDF coords (computed manually below)
    // Width/height just scale by SCALE factor
    let pdfWidth = w / SCALE;
    let pdfHeight = h / SCALE;

    // PDF y is bottom-left origin, so we need to adjust:
    // canvasY is from top, PDF y is from bottom
    // The bottom of the rectangle in canvas coords = y + h
    // PDF y of bottom = (viewport.height - (y + h)) / SCALE
    let pdfY = (viewport.height - (y + h)) / SCALE;
    let pdfX = x / SCALE;
    
    // Apply snap-to-grid if Shift is pressed
    if (shiftPressed && gridSize > 0) {
      const snapped = snapRectToGrid(pdfX, pdfY, pdfWidth, pdfHeight, gridSize);
      pdfX = snapped.x;
      pdfY = snapped.y;
      pdfWidth = snapped.width;
      pdfHeight = snapped.height;
    }
    
    // Proximity label inference from OCR
    let suggestedName = '';
    if (enableOCR && ocrWords.length > 0) {
      const nearbyLabel = findNearbyLabel(pdfX, pdfY, pdfWidth, pdfHeight, ocrWords);
      if (nearbyLabel) {
        suggestedName = labelToFieldName(nearbyLabel);
      }
    }
    
    // If no suggested name from OCR, generate a descriptive default
    if (!suggestedName) {
      const fieldCount = fields.filter(f => f.page === currentPage - 1).length + 1;
      suggestedName = `field_page${currentPage}_${fieldCount}`;
    }

    const newField: Field = {
      id: Date.now().toString(),
      name: suggestedName,
      sourceFieldId: suggestedName,
      semanticKey: toSemanticKeyFromFieldId(suggestedName),
      displayLabel: toDisplayLabelFromFieldId(suggestedName),
      page: currentPage - 1,
      x: pdfX,
      y: pdfY,
      width: pdfWidth,
      height: pdfHeight,
      type: defaultType,
      fontSize: 10,
      maxWidth: pdfWidth,
    };

    onFieldAdded(newField);
    setDrawing(null);
  };

  return (
    <div className="pdf-viewer">
      <div className="pdf-canvas-wrap">
        {ocrStatus && <div className="pdf-ocr-status" role="status">{ocrStatus}</div>}
        <canvas ref={canvasRef} className="pdf-canvas" />
        <canvas
          ref={overlayRef}
          className="pdf-overlay"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isMouseDown.current) {
              isMouseDown.current = false;
              setDrawing(null);
            }
          }}
        />
      </div>
      <div className="pdf-pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          ← Prev
        </button>
        <span>
          Page {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next →
        </button>
      </div>
      {shiftPressed && gridSize > 0 && (
        <div className="pdf-hint">
          🔲 Snap-to-grid active ({gridSize}px grid)
        </div>
      )}
      {(enableOCR || enableAutoDetect) && ocrWords.length > 0 && (
        <div className="pdf-hint">
          📝 OCR detected {ocrWords.length} words (proximity labeling enabled)
        </div>
      )}
    </div>
  );
};
