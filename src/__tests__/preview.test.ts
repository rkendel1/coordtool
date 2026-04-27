/**
 * Test PDF preview generation
 */

import { PDFDocument } from 'pdf-lib';
import { generateLayout, generateMapping, generateTransforms, generateTables } from '../utils/schema';
import { renderPdf } from '../renderer/pdfRenderer';
import { Field } from '../types/Field';

describe('Preview PDF Generation', () => {
  it('generates valid PDF with checkbox field', async () => {
    // Create a simple PDF template
    const templatePdf = await PDFDocument.create();
    templatePdf.addPage([612, 792]);
    const templateBytes = await templatePdf.save();

    // Define a checkbox field
    const fields: Field[] = [
      {
        id: '1',
        name: 'testCheckbox',
        page: 0,
        x: 100,
        y: 700,
        width: 20,
        height: 20,
        type: 'checkbox',
        fontSize: 12,
        maxWidth: 20,
      },
    ];

    // Generate schemas
    const layout = generateLayout(fields);
    const mapping = generateMapping(fields);
    const transforms = generateTransforms(fields);
    const tables = generateTables(fields);

    // Preview data (checkbox checked)
    const previewData = {
      testCheckbox: 'true',
    };

    // Render PDF
    const pdfBytes = await renderPdf({
      pdfTemplate: templateBytes,
      layout,
      mapping,
      transforms,
      data: previewData,
      tables,
    });

    // Verify PDF is valid
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);

    // Try to load the generated PDF to verify it's valid
    const generatedPdf = await PDFDocument.load(pdfBytes);
    expect(generatedPdf.getPageCount()).toBe(1);
  });

  it('generates valid PDF with text field', async () => {
    // Create a simple PDF template
    const templatePdf = await PDFDocument.create();
    templatePdf.addPage([612, 792]);
    const templateBytes = await templatePdf.save();

    // Define a text field
    const fields: Field[] = [
      {
        id: '1',
        name: 'testField',
        page: 0,
        x: 100,
        y: 700,
        width: 200,
        height: 20,
        type: 'text',
        fontSize: 12,
        maxWidth: 200,
      },
    ];

    // Generate schemas
    const layout = generateLayout(fields);
    const mapping = generateMapping(fields);
    const transforms = generateTransforms(fields);
    const tables = generateTables(fields);

    // Preview data
    const previewData = {
      testField: 'Test Value',
    };

    // Render PDF
    const pdfBytes = await renderPdf({
      pdfTemplate: templateBytes,
      layout,
      mapping,
      transforms,
      data: previewData,
      tables,
    });

    // Verify PDF is valid
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);

    // Try to load the generated PDF to verify it's valid
    const generatedPdf = await PDFDocument.load(pdfBytes);
    expect(generatedPdf.getPageCount()).toBe(1);
  });

  it('generates valid PDF with empty preview data', async () => {
    // Create a simple PDF template
    const templatePdf = await PDFDocument.create();
    templatePdf.addPage([612, 792]);
    const templateBytes = await templatePdf.save();

    // Define fields
    const fields: Field[] = [
      {
        id: '1',
        name: 'field1',
        page: 0,
        x: 100,
        y: 700,
        width: 200,
        height: 20,
        type: 'text',
        fontSize: 12,
        maxWidth: 200,
      },
    ];

    // Generate schemas
    const layout = generateLayout(fields);
    const mapping = generateMapping(fields);
    const transforms = generateTransforms(fields);
    const tables = generateTables(fields);

    // Empty preview data
    const previewData = {};

    // Render PDF (should still work, just with empty fields)
    const pdfBytes = await renderPdf({
      pdfTemplate: templateBytes,
      layout,
      mapping,
      transforms,
      data: previewData,
      tables,
    });

    // Verify PDF is valid
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);

    // Try to load the generated PDF to verify it's valid
    const generatedPdf = await PDFDocument.load(pdfBytes);
    expect(generatedPdf.getPageCount()).toBe(1);
  });
});
