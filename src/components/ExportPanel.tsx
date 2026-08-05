import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import { Field } from '../types/Field';
import {
  generateLayoutArtifact,
  generateManifest,
  generateMapping,
  generateFieldsArtifact,
  generateQuestions,
  generateTransformsArtifact,
  generateValidationArtifact,
  generateTables,
  downloadJson,
} from '../utils/schema';
import './ExportPanel.css';

interface Props {
  fields: Field[];
  capabilityId?: string;
  compact?: boolean;
}

export const ExportPanel: React.FC<Props> = ({
  fields,
  capabilityId = '',
  compact = false,
}) => {
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const validFields = fields.filter(
    (f) =>
      f.sourceFieldId.trim() !== '' &&
      f.semanticKey.trim() !== '' &&
      f.displayLabel.trim() !== ''
  );
  const normalizedCapability = capabilityId.trim().toLowerCase();
  const canExport = validFields.length > 0 && normalizedCapability.length > 0;

  const generateArtifacts = async () => {
    setIsGeneratingQuestions(true);
    setProgressMessage('Generating questions — this is the longest step…');
    await new Promise(resolve => window.setTimeout(resolve, 0));
    const questions = await generateQuestions(validFields, {
      capability: normalizedCapability,
    });
    return {
      layout: generateLayoutArtifact(validFields),
      mapping: generateMapping(validFields, { capability: normalizedCapability }),
      transforms: generateTransformsArtifact(validFields),
      fields: generateFieldsArtifact(validFields),
      tables: generateTables(validFields),
      manifest: generateManifest({ capability: normalizedCapability }),
      validation: generateValidationArtifact(validFields),
      questions,
    };
  };

  const handleExportSchema = async () => {
    if (!canExport) return;
    try {
      const artifacts = await generateArtifacts();
      setProgressMessage('Preparing schema.json…');
      downloadJson(artifacts, 'schema.json');
    } catch (err) {
      console.error('Combined export failed:', err);
      alert('Failed to export schema.json');
    } finally {
      setIsGeneratingQuestions(false);
      setProgressMessage('');
    }
  };

  const handleExportZip = async () => {
    if (!canExport) return;
    try {
      const artifacts = await generateArtifacts();
      setProgressMessage('Compressing export ZIP…');
      const zip = new JSZip();
      Object.entries(artifacts).forEach(([name, data]) => {
        zip.file(`${name}.json`, JSON.stringify(data, null, 2));
      });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'schema-artifacts.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP export failed:', err);
      alert('Failed to export schema-artifacts.zip');
    } finally {
      setIsGeneratingQuestions(false);
      setProgressMessage('');
    }
  };

  const incomplete = fields.filter(
    (f) =>
      !f.sourceFieldId.trim() ||
      !f.semanticKey.trim() ||
      !f.displayLabel.trim()
  ).length;

  const panel = (
    <div className={`export-panel${compact ? ' export-panel-compact' : ''}`}>
      <div className="ep-heading">
        <h3 className="ep-title">Export</h3>
        {compact && (
          <button className="ep-close" onClick={() => detailsRef.current?.removeAttribute('open')} aria-label="Close export">×</button>
        )}
      </div>

      {incomplete > 0 && (
        <p className="ep-warn">
          ⚠️ {incomplete} field{incomplete > 1 ? 's' : ''} missing sourceFieldId, semanticKey, or displayLabel — skipped in export.
        </p>
      )}

      <p className="ep-count">
        {validFields.length} field{validFields.length !== 1 ? 's' : ''} ready
      </p>

      {normalizedCapability.length === 0 && (
        <p className="ep-warn">⚠️ Enter a capability id to enable exports.</p>
      )}

      <div className="ep-buttons">
        <button
          className="ep-btn ep-btn-primary"
          onClick={handleExportZip}
          disabled={!canExport || isGeneratingQuestions}
        >
          📦 Export all as ZIP
        </button>
        <button
          className="ep-btn ep-btn-primary"
          onClick={handleExportSchema}
          disabled={!canExport || isGeneratingQuestions}
        >
          🧩 Export as one schema.json
        </button>
      </div>

      {isGeneratingQuestions && (
        <div className="ep-progress" role="status" aria-live="polite">
          <span className="ep-spinner" />
          <span>{progressMessage}</span>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <details className="header-export" ref={detailsRef}>
        <summary>Export ({validFields.length})</summary>
        {panel}
      </details>
    );
  }

  return panel;
};
