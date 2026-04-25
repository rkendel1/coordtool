import React, { useState } from 'react';
import { searchTemplates, getTemplatesByForm, FieldTemplate } from '../utils/templates';
import './FieldTemplatePicker.css';

interface Props {
  onSelectTemplate: (template: FieldTemplate) => void;
}

export const FieldTemplatePicker: React.FC<Props> = ({ onSelectTemplate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState<'ACORD 125' | 'ACORD 126' | 'ACORD 130' | 'All'>('All');
  const [isOpen, setIsOpen] = useState(false);

  const templates = searchQuery.trim()
    ? searchTemplates(searchQuery)
    : getTemplatesByForm(selectedForm);

  return (
    <div className="template-picker">
      <button
        className="template-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        📚 Field Templates {isOpen ? '▼' : '▶'}
      </button>

      {isOpen && (
        <div className="template-panel">
          <div className="template-search">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="template-input"
            />
          </div>

          {!searchQuery && (
            <div className="template-filters">
              {(['All', 'ACORD 125', 'ACORD 126', 'ACORD 130'] as const).map((form) => (
                <button
                  key={form}
                  className={`template-filter${selectedForm === form ? ' active' : ''}`}
                  onClick={() => setSelectedForm(form)}
                >
                  {form}
                </button>
              ))}
            </div>
          )}

          <div className="template-list">
            {templates.length === 0 ? (
              <div className="template-empty">No templates found</div>
            ) : (
              templates.map((t, i) => (
                <div
                  key={`${t.name}-${i}`}
                  className="template-item"
                  onClick={() => onSelectTemplate(t)}
                  title={t.description || t.name}
                >
                  <span className="template-name">{t.name}</span>
                  <span
                    className="template-type"
                    style={{
                      background:
                        t.type === 'text'
                          ? '#4a90d9'
                          : t.type === 'date'
                          ? '#8040c0'
                          : t.type === 'currency'
                          ? '#d04040'
                          : '#32a85c',
                    }}
                  >
                    {t.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
