import React, { useState } from 'react';
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
  const validFields = fields.filter(
    (f) =>
      f.sourceFieldId.trim() !== '' &&
      f.semanticKey.trim() !== '' &&
      f.displayLabel.trim() !== ''
  );
  const normalizedCapability = capabilityId.trim().toLowerCase();
  const canExport = validFields.length > 0 && normalizedCapability.length > 0;

  const handleExportLayout = () => {
    downloadJson(generateLayoutArtifact(validFields), 'layout.json');
  };

  const handleExportMapping = () => {
    downloadJson(generateMapping(validFields, { capability: normalizedCapability }), 'mapping.json');
  };

  const handleExportTransforms = () => {
    downloadJson(generateTransformsArtifact(validFields), 'transforms.json');
  };

  const handleExportFields = () => {
    downloadJson(generateFieldsArtifact(validFields), 'fields.json');
  };

  const handleExportManifest = () => {
    downloadJson(generateManifest({ capability: normalizedCapability }), 'manifest.json');
  };

  const handleExportValidation = () => {
    downloadJson(generateValidationArtifact(validFields), 'validation.json');
  };

  const handleExportQuestions = async () => {
    if (!canExport) return;
    setIsGeneratingQuestions(true);
    try {
      const questions = await generateQuestions(validFields, {
        capability: normalizedCapability,
      });
      downloadJson(questions, 'questions.json');
    } catch (err) {
      console.error('Question export failed:', err);
      alert('Failed to generate questions.json');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleExportAll = async () => {
    if (!canExport) return;
    setIsGeneratingQuestions(true);
    try {
      const questions = await generateQuestions(validFields, {
        capability: normalizedCapability,
      });
      const schema = {
        layout: generateLayoutArtifact(validFields),
        mapping: generateMapping(validFields, { capability: normalizedCapability }),
        transforms: generateTransformsArtifact(validFields),
        fields: generateFieldsArtifact(validFields),
        tables: generateTables(validFields),
        manifest: generateManifest({ capability: normalizedCapability }),
        validation: generateValidationArtifact(validFields),
        questions,
      };
      downloadJson(schema, 'schema.json');
    } catch (err) {
      console.error('Combined export failed:', err);
      alert('Failed to export schema.json');
    } finally {
      setIsGeneratingQuestions(false);
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
      <h3 className="ep-title">Export</h3>

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
          className="ep-btn"
          onClick={handleExportLayout}
          disabled={!canExport}
          title="Download layout.json — coordinates + types"
        >
          📐 layout.json
        </button>
        <button
          className="ep-btn"
          onClick={handleExportMapping}
          disabled={!canExport}
          title="Download mapping.json — canonical mapping scaffold"
        >
          🗺 mapping.json
        </button>
        <button
          className="ep-btn"
          onClick={handleExportTransforms}
          disabled={!canExport}
          title="Download transforms.json — format rules"
        >
          🔧 transforms.json
        </button>
        <button
          className="ep-btn"
          onClick={handleExportFields}
          disabled={!canExport}
          title="Download fields.json — semantic/physical field registry"
        >
          🧾 fields.json
        </button>
        <button
          className="ep-btn"
          onClick={handleExportManifest}
          disabled={!canExport}
          title="Download manifest.json — capability metadata"
        >
          🧭 manifest.json
        </button>
        <button
          className="ep-btn"
          onClick={handleExportValidation}
          disabled={!canExport}
          title="Download validation.json — required-field rules"
        >
          ✅ validation.json
        </button>
        <button
          className="ep-btn"
          onClick={handleExportQuestions}
          disabled={!canExport || isGeneratingQuestions}
          title="Download questions.json — field-linked intake questions"
        >
          ❓ {isGeneratingQuestions ? 'Generating questions...' : 'questions.json'}
        </button>
        <button
          className="ep-btn ep-btn-primary"
          onClick={handleExportAll}
          disabled={!canExport || isGeneratingQuestions}
          title="Download combined schema.json"
        >
          ⬇ {isGeneratingQuestions ? 'Generating...' : 'Export All (schema.json)'}
        </button>
      </div>
    </div>
  );

  if (compact) {
    return (
      <details className="header-export">
        <summary>Export ({validFields.length})</summary>
        {panel}
      </details>
    );
  }

  return panel;
};
