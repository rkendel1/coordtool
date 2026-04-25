import React from 'react';
import { Field } from '../types/Field';
import {
  generateLayout,
  generateMapping,
  generateTransforms,
  generateTables,
  downloadJson,
} from '../utils/schema';
import './ExportPanel.css';

interface Props {
  fields: Field[];
}

export const ExportPanel: React.FC<Props> = ({ fields }) => {
  const validFields = fields.filter((f) => f.name.trim() !== '');

  const handleExportLayout = () => {
    downloadJson(generateLayout(validFields), 'layout.json');
  };

  const handleExportMapping = () => {
    downloadJson(generateMapping(validFields), 'mapping.json');
  };

  const handleExportTransforms = () => {
    downloadJson(generateTransforms(validFields), 'transforms.json');
  };

  const handleExportAll = () => {
    const schema = {
      layout: generateLayout(validFields),
      mapping: generateMapping(validFields),
      transforms: generateTransforms(validFields),
      tables: generateTables(validFields),
    };
    downloadJson(schema, 'schema.json');
  };

  const unnamed = fields.filter((f) => !f.name.trim()).length;

  return (
    <div className="export-panel">
      <h3 className="ep-title">Export</h3>

      {unnamed > 0 && (
        <p className="ep-warn">
          ⚠️ {unnamed} field{unnamed > 1 ? 's' : ''} missing a name — skipped in export.
        </p>
      )}

      <p className="ep-count">
        {validFields.length} named field{validFields.length !== 1 ? 's' : ''} ready
      </p>

      <div className="ep-buttons">
        <button
          className="ep-btn"
          onClick={handleExportLayout}
          disabled={validFields.length === 0}
          title="Download layout.json — coordinates + types"
        >
          📐 layout.json
        </button>
        <button
          className="ep-btn"
          onClick={handleExportMapping}
          disabled={validFields.length === 0}
          title="Download mapping.json — canonical mapping scaffold"
        >
          🗺 mapping.json
        </button>
        <button
          className="ep-btn"
          onClick={handleExportTransforms}
          disabled={validFields.length === 0}
          title="Download transforms.json — format rules"
        >
          🔧 transforms.json
        </button>
        <button
          className="ep-btn ep-btn-primary"
          onClick={handleExportAll}
          disabled={validFields.length === 0}
          title="Download combined schema.json"
        >
          ⬇ Export All (schema.json)
        </button>
      </div>
    </div>
  );
};
