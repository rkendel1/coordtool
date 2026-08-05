/**
 * Schema-driven PDF rendering engine
 * Implements Phase 2, Item 1: Build a schema-driven rendering engine
 */

import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import {
  LayoutEntry,
  MappingArtifact,
  TransformEntry,
  TableDefinition,
} from '../types/Field';
import { applyFormatter } from '../formatters';

export interface PageOffset {
  x: number;
  y: number;
}

export interface RenderOptions {
  pdfTemplate: Uint8Array | ArrayBuffer;
  layout: Record<string, LayoutEntry>;
  mapping: MappingArtifact;
  transforms: Record<string, TransformEntry>;
  data: Record<string, any>;
  tables?: Record<string, TableDefinition>;
  pageOffsets?: Record<number, PageOffset>; // Phase 2, Item 7: Page calibration
  maxLines?: Record<string, number>; // Phase 2, Item 3: Multiline overflow
  overflowStrategy?: 'truncate' | 'shrink' | 'continue'; // Phase 2, Item 3
}

function toSemanticTransformKey(fieldName: string): string {
  return fieldName
    .replace(/[^a-zA-Z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}

/**
 * Resolve a value from data using the mapping
 */
export function resolveValue(
  mapping: MappingArtifact,
  data: Record<string, any>,
  layoutField: string
): any {
  const mappingEntry = mapping.mappings.find(
    entry => entry.binding.fieldId === layoutField
  );
  if (!mappingEntry) return undefined;

  const dataPath = mappingEntry.semanticKey;
  
  // Navigate nested data structure
  const parts = dataPath.split('.');
  let value = data;
  
  for (const part of parts) {
    if (value === null || value === undefined) {
      return data[layoutField];
    }
    value = value[part];
  }
  
  return value ?? data[layoutField];
}

/**
 * Apply transforms to a field value
 */
export function applyTransforms(
  fieldName: string,
  value: any,
  transforms: Record<string, TransformEntry>,
  mapping?: MappingArtifact
): string {
  const candidateKeys = [fieldName, toSemanticTransformKey(fieldName)];
  const mappingEntry = mapping?.mappings.find(
    entry => entry.binding.fieldId === fieldName
  );
  if (mappingEntry?.semanticKey) {
    candidateKeys.push(mappingEntry.semanticKey);
  }

  const transform = candidateKeys
    .map((key) => transforms[key])
    .find((entry) => !!entry);
  
  if (!transform) {
    return value === null || value === undefined ? '' : String(value);
  }
  
  return applyFormatter(value, transform.type, transform.format);
}

/**
 * Wrap text to fit within maxWidth
 * Note: Uses rough character-width estimate (0.5 * fontSize)
 * For more accurate wrapping with proportional fonts, consider using
 * pdf-lib's text width measurement capabilities
 */
export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  // Rough estimate: ~0.5 * fontSize per character
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
  
  if (charsPerLine <= 0) return [text];
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= charsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * Handle multiline text with overflow strategies
 * Phase 2, Item 3: Solve multiline + overflow properly
 */
export function handleMultilineOverflow(
  lines: string[],
  maxLines?: number,
  strategy: 'truncate' | 'shrink' | 'continue' = 'truncate'
): string[] {
  if (!maxLines || lines.length <= maxLines) {
    return lines;
  }
  
  switch (strategy) {
    case 'truncate':
      const truncated = lines.slice(0, maxLines);
      if (truncated.length > 0) {
        // Add ellipsis to last line if it doesn't already end with one
        const lastLine = truncated[truncated.length - 1];
        if (!lastLine.endsWith('...')) {
          truncated[truncated.length - 1] = lastLine + '...';
        }
      }
      return truncated;
    
    case 'shrink':
      // For now, just truncate - actual font shrinking would require pdf-lib integration
      return lines.slice(0, maxLines);
    
    case 'continue':
      // Return all lines (they may overflow the field)
      return lines;
    
    default:
      return lines.slice(0, maxLines);
  }
}

/**
 * Draw a text field on a PDF page
 */
export async function drawTextField(
  page: PDFPage,
  field: LayoutEntry,
  value: string,
  pageOffset: PageOffset = { x: 0, y: 0 },
  maxLines?: number,
  overflowStrategy?: 'truncate' | 'shrink' | 'continue'
): Promise<void> {
  if (!value) return;
  
  const x = field.x + pageOffset.x;
  const y = field.y + pageOffset.y;
  const fontSize = field.fontSize;
  
  // Handle multiline text
  const lines = wrapText(value, field.maxWidth, fontSize);
  const processedLines = handleMultilineOverflow(lines, maxLines, overflowStrategy);
  
  // Draw each line
  for (let i = 0; i < processedLines.length; i++) {
    const lineY = y - (i * fontSize * 1.2); // 1.2 line spacing
    
    page.drawText(processedLines[i], {
      x,
      y: lineY,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
  }
}

/**
 * Draw a checkbox field on a PDF page
 * Phase 2, Item 6: Checkbox engine
 */
export async function drawCheckbox(
  page: PDFPage,
  field: LayoutEntry,
  value: boolean,
  pageOffset: PageOffset = { x: 0, y: 0 },
  style: 'X' | 'checkmark' | 'filled' = 'X'
): Promise<void> {
  if (!value) return;
  
  const x = field.x + pageOffset.x;
  const y = field.y + pageOffset.y;
  const fontSize = field.fontSize;
  
  switch (style) {
    case 'X':
      page.drawText('X', {
        x,
        y,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      break;
    
    case 'checkmark':
      page.drawText('✓', {
        x,
        y,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      break;
    
    case 'filled':
      // Draw a filled rectangle
      page.drawRectangle({
        x,
        y,
        width: field.width,
        height: field.height,
        color: rgb(0, 0, 0),
      });
      break;
  }
}

/**
 * Draw a table on a PDF page
 * Phase 2, Item 4: Implement table rendering engine
 */
export async function drawTable(
  page: PDFPage,
  table: TableDefinition,
  data: any[],
  pageOffset: PageOffset = { x: 0, y: 0 }
): Promise<void> {
  const startY = table.startY + pageOffset.y;
  const rowHeight = table.rowHeight;
  const maxRows = table.maxRows;
  
  // Limit rows to maxRows
  const rowsToRender = data.slice(0, maxRows);
  
  for (let rowIndex = 0; rowIndex < rowsToRender.length; rowIndex++) {
    const row = rowsToRender[rowIndex];
    const rowY = startY - (rowIndex * rowHeight);
    
    for (const [columnKey, column] of Object.entries(table.columns)) {
      const value = row[columnKey];
      if (value === null || value === undefined) continue;
      
      const x = column.x + pageOffset.x;
      
      page.drawText(String(value), {
        x,
        y: rowY,
        size: 10, // Default font size for table cells
        color: rgb(0, 0, 0),
      });
    }
  }
}

/**
 * Draw a single field on a PDF page
 */
export async function drawField(
  page: PDFPage,
  fieldName: string,
  field: LayoutEntry,
  value: string,
  pageOffset: PageOffset = { x: 0, y: 0 },
  maxLines?: number,
  overflowStrategy?: 'truncate' | 'shrink' | 'continue'
): Promise<void> {
  if (field.type === 'checkbox') {
    const boolValue = value === 'true' || value === '1' || (typeof value === 'boolean' && value);
    const style = field.checkboxStyle || 'X';
    await drawCheckbox(page, field, boolValue, pageOffset, style);
  } else {
    await drawTextField(page, field, value, pageOffset, maxLines, overflowStrategy);
  }
}

/**
 * Main entry point: Render a PDF with data
 * Phase 2, Item 1: Schema-driven rendering engine
 */
export async function renderPdf(options: RenderOptions): Promise<Uint8Array> {
  const {
    pdfTemplate,
    layout,
    mapping,
    transforms,
    data,
    tables = {},
    pageOffsets = {},
    maxLines = {},
    overflowStrategy = 'truncate',
  } = options;
  
  // Load the PDF template
  // Support encrypted PDFs by ignoring encryption
  const pdfDoc = await PDFDocument.load(pdfTemplate, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  
  // Render regular fields
  const layoutEntries = Object.entries(layout);
  for (let index = 0; index < layoutEntries.length; index++) {
    const [fieldName, field] = layoutEntries[index];
    const layoutField = `field_${String(index + 1).padStart(3, '0')}`;
    // Resolve value from data
    const rawValue = resolveValue(mapping, data, layoutField);
    
    // Apply transforms
    const formattedValue = applyTransforms(layoutField, rawValue, transforms, mapping);
    
    // Get page and offset
    const page = pages[field.page];
    if (!page) continue;
    
    const pageOffset = pageOffsets[field.page] || { x: 0, y: 0 };
    const fieldMaxLines = maxLines[fieldName];
    
    // Draw field
    await drawField(
      page,
      fieldName,
      field,
      formattedValue,
      pageOffset,
      fieldMaxLines,
      overflowStrategy
    );
  }
  
  // Render tables
  for (const [tableName, table] of Object.entries(tables)) {
    const tableData = data[tableName];
    if (!Array.isArray(tableData)) continue;
    
    const page = pages[table.page];
    if (!page) continue;
    
    const pageOffset = pageOffsets[table.page] || { x: 0, y: 0 };
    
    await drawTable(page, table, tableData, pageOffset);
  }
  
  // Save and return the PDF
  return await pdfDoc.save();
}
