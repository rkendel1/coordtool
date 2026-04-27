/**
 * Preview Panel Component
 * Implements Phase 2, Item 2: Add preview mode
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Field } from '../types/Field';
import { generateLayout, generateMapping, generateTransforms, generateTables } from '../utils/schema';
import { renderPdf } from '../renderer/pdfRenderer';
import './PreviewPanel.css';

interface Props {
  fields: Field[];
  pdfFile: File | null;
}

export const PreviewPanel: React.FC<Props> = ({ fields, pdfFile }) => {
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPreview, setAutoPreview] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDataChange = useCallback((fieldName: string, value: string) => {
    setPreviewData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  const handleGeneratePreview = useCallback(async () => {
    if (!pdfFile) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Generate schemas from fields
      const layout = generateLayout(fields);
      const mapping = generateMapping(fields);
      const transforms = generateTransforms(fields);
      const tables = generateTables(fields);

      // Read PDF template
      const templateBytes = await pdfFile.arrayBuffer();

      // Render PDF with preview data
      const pdfBytes = await renderPdf({
        pdfTemplate: templateBytes,
        layout,
        mapping,
        transforms,
        data: previewData,
        tables,
      });

      // Validate PDF was generated
      if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error('PDF generation produced empty output');
      }

      // Create preview URL
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Clean up old URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
      console.error('Preview generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [pdfFile, fields, previewData, previewUrl]);
  
  // Auto-generate preview when data changes (with debounce)
  useEffect(() => {
    if (!autoPreview || !pdfFile) return;
    
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new timer to regenerate preview after 1 second of no changes
    debounceTimer.current = setTimeout(() => {
      handleGeneratePreview();
    }, 1000);
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [previewData, autoPreview, pdfFile, handleGeneratePreview]);

  const handleDownload = useCallback(() => {
    if (!previewUrl) return;

    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = 'preview.pdf';
    a.click();
  }, [previewUrl]);

  const validFields = fields.filter((f) => f.name.trim() !== '');

  return (
    <div className="preview-panel">
      <h2 className="preview-heading">Preview Mode</h2>
      <p className="preview-description">
        Fill in sample data and preview the rendered PDF
      </p>

      <div className="preview-data-inputs">
        <h3 className="preview-subheading">Sample Data</h3>
        {validFields.length === 0 ? (
          <p className="preview-empty">No fields defined yet</p>
        ) : (
          <div className="preview-inputs-list">
            {validFields.map((field) => (
              <div key={field.id} className="preview-input-row">
                <label className="preview-input-label">
                  {field.name}
                  <span className="preview-input-type">({field.type})</span>
                </label>
                {field.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    className="preview-input-checkbox"
                    checked={previewData[field.name] === 'true' || previewData[field.name] === true}
                    onChange={(e) => handleDataChange(field.name, String(e.target.checked))}
                  />
                ) : field.type === 'multiline' ? (
                  <textarea
                    className="preview-input-textarea"
                    value={previewData[field.name] || ''}
                    onChange={(e) => handleDataChange(field.name, e.target.value)}
                    placeholder={`Enter ${field.name}...`}
                    rows={3}
                  />
                ) : (
                  <input
                    type="text"
                    className="preview-input-text"
                    value={previewData[field.name] || ''}
                    onChange={(e) => handleDataChange(field.name, e.target.value)}
                    placeholder={`Enter ${field.name}...`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="preview-actions">
        <button
          className="preview-button preview-button-primary"
          onClick={handleGeneratePreview}
          disabled={isGenerating || validFields.length === 0}
        >
          {isGenerating ? 'Generating...' : '🔍 Generate Preview'}
        </button>
        {previewUrl && (
          <button
            className="preview-button preview-button-secondary"
            onClick={handleDownload}
          >
            💾 Download Preview
          </button>
        )}
        <label className="preview-auto-toggle">
          <input
            type="checkbox"
            checked={autoPreview}
            onChange={(e) => setAutoPreview(e.target.checked)}
          />
          <span>Auto-update preview</span>
        </label>
      </div>

      {error && (
        <div className="preview-error">
          ⚠️ {error}
        </div>
      )}

      {previewUrl && (
        <div className="preview-viewer">
          <h3 className="preview-subheading">Preview Result</h3>
          <iframe
            src={previewUrl}
            className="preview-iframe"
            title="PDF Preview"
          />
        </div>
      )}
    </div>
  );
};
