import React, { useEffect, useRef } from 'react';
import { Field, FieldType } from '../types/Field';
import { requiresSemanticCorrection, suggestSemanticKey } from '../utils/fieldNames';
import './FieldList.css';

const TYPE_BADGE_COLORS: Record<FieldType, string> = {
  text: '#4a90d9',
  multiline: '#32a85c',
  checkbox: '#e08020',
  date: '#8040c0',
  dob: '#6d4ea6',
  currency: '#d04040',
  phone: '#2c9c8a',
  ssn: '#6c757d',
  ein: '#5f6caf',
  zip: '#3d7ea6',
  signature: '#8a6d3b',
  initials: '#9b59b6',
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
  const selectedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

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
          ref={f.id === selectedId ? selectedRef : null}
          className={`fl-item${f.id === selectedId ? ' fl-selected' : ''}`}
          onClick={() => onSelect(f.id)}
          aria-selected={f.id === selectedId}
        >
          <span
            className="fl-badge"
            style={{ background: TYPE_BADGE_COLORS[f.type] }}
          >
            {f.type}
          </span>
          <span className="fl-page">p{f.page + 1}</span>
          {requiresSemanticCorrection(f) && (
            <span
              className="fl-warning"
              title={`Semantic key needs correction: ${f.semanticKey} → ${suggestSemanticKey(f)}`}
              aria-label="Semantic key warning"
            >
              ⚠
            </span>
          )}
          <div className="fl-name" title={`PDF field: ${f.sourceFieldId}`}>
            {f.displayLabel || f.sourceFieldId || <em>(unlabeled)</em>}
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
