import React from 'react';
import { Field, FieldType } from '../types/Field';
import './FieldList.css';

const TYPE_BADGE_COLORS: Record<FieldType, string> = {
  text: '#4a90d9',
  multiline: '#32a85c',
  checkbox: '#e08020',
  date: '#8040c0',
  currency: '#d04040',
  table: '#10a0a0',
};

interface Props {
  fields: Field[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const FieldList: React.FC<Props> = ({
  fields,
  selectedId,
  onSelect,
  onDelete,
}) => {
  if (fields.length === 0) {
    return (
      <div className="field-list-empty">
        No fields yet. Draw boxes on the PDF to add fields.
      </div>
    );
  }

  return (
    <div className="field-list">
      {fields.map((f) => (
        <div
          key={f.id}
          className={`fl-item${f.id === selectedId ? ' fl-selected' : ''}`}
          onClick={() => onSelect(f.id)}
        >
          <div className="fl-name">{f.name || <em>(unnamed)</em>}</div>
          <div className="fl-meta">
            <span
              className="fl-badge"
              style={{ background: TYPE_BADGE_COLORS[f.type] }}
            >
              {f.type}
            </span>
            <span className="fl-page">pg {f.page}</span>
          </div>
          <button
            className="fl-del"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(f.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
