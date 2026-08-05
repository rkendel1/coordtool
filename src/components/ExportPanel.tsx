import React, { useRef } from 'react';
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
  generateDocumentSchema,
  generateTables,
  downloadJson,
} from '../utils/schema';
import './ExportPanel.css';
import { requiresSemanticCorrection } from '../utils/fieldNames';

interface Props {
  fields: Field[];
  templateFile: File;
  capabilityId?: string;
  compact?: boolean;
}

export const ExportPanel: React.FC<Props> = ({
  fields,
  templateFile,
  capabilityId = '',
  compact = false,
}) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const validFields = fields.filter(
    (f) =>
      f.sourceFieldId.trim() !== '' &&
      f.semanticKey.trim() !== '' &&
      f.displayLabel.trim() !== '' &&
      !requiresSemanticCorrection(f)
  );
  const normalizedCapability = capabilityId.trim().toLowerCase();
  const nonCanonical = fields.filter(requiresSemanticCorrection).length;
  const canExport = validFields.length > 0 && normalizedCapability.length > 0 && nonCanonical === 0;

  const generateArtifacts = async () => {
    return {
      manifest: generateManifest({ capability: normalizedCapability }),
      schema: await generateDocumentSchema(validFields, { capability: normalizedCapability }),
      questions: await generateQuestions(validFields),
      layout: generateLayoutArtifact(validFields),
      mapping: generateMapping(validFields),
      transforms: generateTransformsArtifact(validFields),
      validation: generateValidationArtifact(validFields),
    };
  };

  const handleExportArtifact = async (name: string) => {
    if (!canExport) return;
    try {
      let artifact: unknown;
      switch (name) {
        case 'layout': artifact = generateLayoutArtifact(validFields); break;
        case 'mapping': artifact = generateMapping(validFields, { capability: normalizedCapability }); break;
        case 'transforms': artifact = generateTransformsArtifact(validFields); break;
        case 'fields': artifact = generateFieldsArtifact(validFields); break;
        case 'tables': artifact = generateTables(validFields); break;
        case 'manifest': artifact = generateManifest({ capability: normalizedCapability }); break;
        case 'validation': artifact = generateValidationArtifact(validFields); break;
        case 'questions':
          artifact = await generateQuestions(validFields, { capability: normalizedCapability });
          break;
        default: return;
      }
      downloadJson(artifact, `${name}.json`);
    } catch (err) {
      console.error(`${name} export failed:`, err);
      alert(`Failed to export ${name}.json`);
    }
  };

  const handleExportSchema = async () => {
    if (!canExport) return;
    try {
      const artifacts = await generateArtifacts();
      downloadJson(artifacts.schema, 'schema.json');
    } catch (err) {
      console.error('Combined export failed:', err);
      alert('Failed to export schema.json');
    }
  };

  const handleExportZip = async () => {
    if (!canExport) return;
    try {
      const artifacts = await generateArtifacts();
      const zip = new JSZip();
      zip.file('manifest.json', JSON.stringify(artifacts.manifest, null, 2));
      zip.file('template.pdf', templateFile);
      zip.file('schema.json', JSON.stringify(artifacts.schema, null, 2));
      zip.file('questions.json', JSON.stringify(artifacts.questions, null, 2));
      zip.file('layout.json', JSON.stringify(artifacts.layout, null, 2));
      zip.file('mapping.json', JSON.stringify(artifacts.mapping, null, 2));
      zip.file('transforms.json', JSON.stringify(artifacts.transforms, null, 2));
      zip.file('validation.json', JSON.stringify(artifacts.validation, null, 2));
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

      {nonCanonical > 0 && (
        <p className="ep-warn">
          ⚠️ {nonCanonical} field{nonCanonical > 1 ? 's have' : ' has'} PDF-derived semantic keys — correct them before export.
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
          disabled={!canExport}
        >
          📦 Export all as ZIP
        </button>
        <button
          className="ep-btn ep-btn-primary"
          onClick={handleExportSchema}
          disabled={!canExport}
        >
          🧩 Export as one schema.json
        </button>
      </div>

      <div className="ep-individual">
        <h4 className="ep-subtitle">Individual files</h4>
        <div className="ep-file-grid">
          {['layout', 'mapping', 'transforms', 'fields', 'tables', 'manifest', 'validation', 'questions'].map(name => (
            <button
              key={name}
              className="ep-btn ep-btn-file"
              onClick={() => handleExportArtifact(name)}
              disabled={!canExport}
            >
              {name}.json
            </button>
          ))}
        </div>
      </div>

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
