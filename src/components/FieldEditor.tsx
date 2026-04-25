import React from 'react';
import { Field, FieldType } from '../types/Field';
import './FieldEditor.css';

const FIELD_TYPES: FieldType[] = [
  'text',
  'multiline',
  'checkbox',
  'date',
  'currency',
  'table',
];

interface Props {
  field: Field;
  onChange: (updated: Field) => void;
  onDelete: (id: string) => void;
}

export const FieldEditor: React.FC<Props> = ({ field, onChange, onDelete }) => {
  const update = (patch: Partial<Field>) => onChange({ ...field, ...patch });

  return (
    <div className="field-editor">
      <h3 className="fe-title">Edit Field</h3>

      <label className="fe-label">Field Name</label>
      <input
        className="fe-input"
        type="text"
        placeholder="e.g. applicantName"
        value={field.name}
        onChange={(e) => update({ name: e.target.value })}
      />

      <label className="fe-label">Type</label>
      <select
        className="fe-select"
        value={field.type}
        onChange={(e) => update({ type: e.target.value as FieldType })}
      >
        {FIELD_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {field.type === 'table' && (
        <>
          <label className="fe-label">Table Group</label>
          <input
            className="fe-input"
            type="text"
            placeholder="e.g. locations"
            value={field.tableGroup ?? ''}
            onChange={(e) => update({ tableGroup: e.target.value })}
          />
        </>
      )}

      <label className="fe-label">Font Size</label>
      <input
        className="fe-input"
        type="number"
        min={6}
        max={72}
        value={field.fontSize ?? 10}
        onChange={(e) => update({ fontSize: Number(e.target.value) })}
      />

      <label className="fe-label">Max Width</label>
      <input
        className="fe-input"
        type="number"
        min={0}
        value={field.maxWidth ?? Math.round(field.width)}
        onChange={(e) => update({ maxWidth: Number(e.target.value) })}
      />

      {field.type === 'multiline' && (
        <label className="fe-check-label">
          <input
            type="checkbox"
            checked={field.multiline ?? true}
            onChange={(e) => update({ multiline: e.target.checked })}
          />
          Multiline
        </label>
      )}

      <div className="fe-coords">
        <span>x: {Math.round(field.x)}</span>
        <span>y: {Math.round(field.y)}</span>
        <span>w: {Math.round(field.width)}</span>
        <span>h: {Math.round(field.height)}</span>
        <span>pg: {field.page}</span>
      </div>

      <button
        className="fe-delete"
        onClick={() => onDelete(field.id)}
      >
        🗑 Delete Field
      </button>
    </div>
  );
};
