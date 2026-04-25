import React, { useRef } from 'react';
import { Field, LayoutEntry } from '../types/Field';
import './ImportPanel.css';

interface Props {
  onImport: (fields: Field[]) => void;
}

export const ImportPanel: React.FC<Props> = ({ onImport }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Check if it's a layout.json or schema.json
      let layout: Record<string, LayoutEntry> = {};
      
      if (data.layout) {
        // It's a schema.json with nested layout
        layout = data.layout;
      } else if (data && typeof data === 'object') {
        // Assume it's a layout.json
        layout = data;
      }

      // Convert layout entries back to Field objects
      const fields: Field[] = [];
      let idCounter = Date.now();

      for (const [name, entry] of Object.entries(layout)) {
        fields.push({
          id: `imported-${idCounter++}`,
          name,
          page: entry.page,
          x: entry.x,
          y: entry.y,
          width: entry.width,
          height: entry.height,
          type: entry.type,
          fontSize: entry.fontSize,
          maxWidth: entry.maxWidth,
        });
      }

      onImport(fields);
      
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import schema. Please check the file format.');
    }
  };

  return (
    <div className="import-panel">
      <h3 className="import-title">Import Schema</h3>
      <p className="import-desc">
        Load a previously exported layout.json or schema.json to continue editing.
      </p>
      <label className="import-btn">
        📥 Import layout.json
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          hidden
          onChange={handleFileSelect}
        />
      </label>
    </div>
  );
};
