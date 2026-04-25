import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Field, FieldType } from '../types/Field';
import './PDFViewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const SCALE = 1.5;

const TYPE_COLORS: Record<FieldType, string> = {
  text: 'rgba(74, 144, 217, 0.35)',
  multiline: 'rgba(80, 200, 120, 0.35)',
  checkbox: 'rgba(255, 160, 60, 0.35)',
  date: 'rgba(160, 100, 220, 0.35)',
  currency: 'rgba(240, 80, 80, 0.35)',
  table: 'rgba(30, 200, 200, 0.35)',
};

const TYPE_STROKE: Record<FieldType, string> = {
  text: '#4a90d9',
  multiline: '#32a85c',
  checkbox: '#e08020',
  date: '#8040c0',
  currency: '#d04040',
  table: '#10a0a0',
};

interface DrawRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface Props {
  file: File;
  fields: Field[];
  selectedId: string | null;
  debugMode: boolean;
  defaultType: FieldType;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onFieldAdded: (field: Field) => void;
  onFieldSelected: (id: string) => void;
}

export const PDFViewer: React.FC<Props> = ({
  file,
  fields,
  selectedId,
  debugMode,
  defaultType,
  currentPage,
  totalPages,
  onPageChange,
  onFieldAdded,
  onFieldSelected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const viewportRef = useRef<pdfjsLib.PageViewport | null>(null);
  const [drawing, setDrawing] = useState<DrawRect | null>(null);
  const isMouseDown = useRef(false);

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

  // Re-render page when page number changes
  useEffect(() => {
    if (pdfRef.current) {
      renderPage(pdfRef.current, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const renderPage = async (
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNum: number
  ) => {
    const page = await pdf.getPage(pageNum);
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
    drawOverlay();
  };

  const drawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const viewport = viewportRef.current;
    if (!overlay || !viewport) return;

    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw saved fields
    for (const f of fields) {
      if (f.page !== currentPage - 1) continue;
      const canvasX = f.x * SCALE;
      const canvasY = viewport.height - (f.y + f.height) * SCALE;
      const canvasW = f.width * SCALE;
      const canvasH = f.height * SCALE;

      ctx.fillStyle = TYPE_COLORS[f.type];
      ctx.fillRect(canvasX, canvasY, canvasW, canvasH);

      ctx.strokeStyle =
        f.id === selectedId ? '#ff4400' : TYPE_STROKE[f.type];
      ctx.lineWidth = f.id === selectedId ? 2.5 : 1.5;
      ctx.strokeRect(canvasX, canvasY, canvasW, canvasH);

      // Label
      ctx.fillStyle = '#1a1a2e';
      ctx.font = '10px monospace';
      ctx.fillText(f.name || '(unnamed)', canvasX + 3, canvasY + 13);

      if (debugMode) {
        ctx.fillStyle = '#555';
        ctx.font = '9px monospace';
        ctx.fillText(
          `x:${Math.round(f.x)} y:${Math.round(f.y)} w:${Math.round(f.width)} h:${Math.round(f.height)}`,
          canvasX + 3,
          canvasY + canvasH - 3
        );
      }
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
  }, [fields, currentPage, selectedId, debugMode, drawing]);

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

    for (const f of fields) {
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
    const pdfWidth = w / SCALE;
    const pdfHeight = h / SCALE;

    // PDF y is bottom-left origin, so we need to adjust:
    // canvasY is from top, PDF y is from bottom
    // The bottom of the rectangle in canvas coords = y + h
    // PDF y of bottom = (viewport.height - (y + h)) / SCALE
    const pdfY = (viewport.height - (y + h)) / SCALE;
    const pdfX = x / SCALE;

    const newField: Field = {
      id: Date.now().toString(),
      name: '',
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
    </div>
  );
};
