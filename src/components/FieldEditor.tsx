import React from 'react';
import { Field, FieldType } from '../types/Field';
import { getOverflowWarning } from '../utils/validation';
import './FieldEditor.css';

const FIELD_TYPES: FieldType[] = [
  'text',
  'multiline',
  'checkbox',
  'date',
  'dob',
  'currency',
  'phone',
  'ssn',
  'ein',
  'zip',
  'signature',
  'initials',
  'table',
];

const DATE_FORMATS = [
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'MM/DD/YY',
  'DD/MM/YY',
  'YYYY/MM/DD',
  'MMMM DD, YYYY',
  'MMM DD, YYYY',
  'DD MMMM YYYY',
  'DD MMM YYYY',
] as const;

const CURRENCY_SYMBOLS = [
  { value: 'USD', label: '$ (USD - US Dollar)' },
  { value: 'EUR', label: '€ (EUR - Euro)' },
  { value: 'GBP', label: '£ (GBP - British Pound)' },
  { value: 'JPY', label: '¥ (JPY - Japanese Yen)' },
  { value: 'CAD', label: '$ (CAD - Canadian Dollar)' },
  { value: 'AUD', label: '$ (AUD - Australian Dollar)' },
  { value: 'CHF', label: 'Fr (CHF - Swiss Franc)' },
  { value: 'CNY', label: '¥ (CNY - Chinese Yuan)' },
] as const;

const HEIGHT_FORMATS = [
  { value: 'inches', label: 'Inches (e.g., 72")' },
  { value: 'feet-inches', label: 'Feet-Inches (e.g., 6\'0")' },
  { value: 'feet', label: 'Feet (e.g., 6ft 0in)' },
  { value: 'cm', label: 'Centimeters (e.g., 183cm)' },
] as const;

const HEIGHT_STORAGE_UNITS = [
  { value: 'inches', label: 'Inches' },
  { value: 'cm', label: 'Centimeters' },
] as const;

const WEIGHT_FORMATS = [
  { value: 'lbs', label: 'Pounds (e.g., 150lbs)' },
  { value: 'kg', label: 'Kilograms (e.g., 68kg)' },
] as const;

const WEIGHT_STORAGE_UNITS = [
  { value: 'lbs', label: 'Pounds' },
  { value: 'kg', label: 'Kilograms' },
] as const;

const STATE_FORMATS = [
  { value: 'abbreviation', label: 'Abbreviation (e.g., CA)' },
  { value: 'full_name', label: 'Full name (e.g., California)' },
  { value: 'lowercase', label: 'Lowercase full name (e.g., california)' },
] as const;

const PHONE_FORMATS = [
  { value: '(xxx) xxx-xxxx', label: '(xxx) xxx-xxxx' },
  { value: 'xxx-xxx-xxxx', label: 'xxx-xxx-xxxx' },
  { value: 'xxxxxxxxxx', label: 'xxxxxxxxxx (digits only)' },
] as const;

const PRESENTATION_SPACING_STRATEGIES = [
  { value: 'semantic', label: 'Semantic' },
  { value: 'template', label: 'Template' },
  { value: 'compact', label: 'Compact' },
] as const;

const PRESENTATION_OVERFLOW_STRATEGIES = [
  { value: 'reflow', label: 'Reflow' },
  { value: 'shrink', label: 'Shrink' },
  { value: 'clip', label: 'Clip' },
  { value: 'expand-region', label: 'Expand Region' },
] as const;

const BOX_INPUT_MODES = [
  { value: 'digits', label: 'Digits only' },
  { value: 'alphanumeric', label: 'Letters + numbers' },
  { value: 'raw', label: 'Raw characters' },
] as const;

const BOXED_TEXT_DISABLED_TYPES: FieldType[] = ['checkbox', 'table', 'signature', 'initials'];
const BOXED_TEXT_DEFAULTS: Partial<Record<FieldType, { pattern: string; inputMode: Field['boxInputMode'] }>> = {
  ssn: { pattern: '3-2-4', inputMode: 'digits' },
  ein: { pattern: '2-7', inputMode: 'digits' },
  phone: { pattern: '3-3-4', inputMode: 'digits' },
  zip: { pattern: '5', inputMode: 'digits' },
  date: { pattern: '2-2-4', inputMode: 'digits' },
  dob: { pattern: '2-2-4', inputMode: 'digits' },
};

const BOXED_TEXT_AUTO_TYPES: FieldType[] = ['ssn', 'ein', 'phone', 'zip'];

const TRANSFORM_TYPES: Array<NonNullable<Field['transformType']>> = [
  'none',
  'date',
  'currency',
  'percentage',
  'phone',
  'height',
  'weight',
  'state',
];

interface Props {
  field: Field;
  onChange: (updated: Field) => void;
  onDelete: (id: string) => void;
}

export const FieldEditor: React.FC<Props> = ({ field, onChange, onDelete }) => {
  const update = (patch: Partial<Field>) => onChange({ ...field, ...patch });
  const overflowWarning = getOverflowWarning(field.type, field.maxWidth ?? field.width);
  const boxedTextDisabled = BOXED_TEXT_DISABLED_TYPES.includes(field.type);

  const buildTypePatch = (nextType: FieldType): Partial<Field> => {
    const patch: Partial<Field> = { type: nextType };

    if (nextType === 'date' || nextType === 'dob') {
      patch.transformType = 'date';
      patch.dateFormat = field.dateFormat ?? 'MM/DD/YYYY';
      patch.transformFormat = field.dateFormat ?? field.transformFormat ?? 'MM/DD/YYYY';
    } else if (nextType === 'currency') {
      patch.transformType = 'currency';
      patch.currencySymbol = field.currencySymbol ?? 'USD';
      patch.transformFormat = field.currencySymbol ?? field.transformFormat ?? 'USD';
    } else if (nextType === 'phone') {
      patch.transformType = 'phone';
      patch.phoneFormat = field.phoneFormat ?? '(xxx) xxx-xxxx';
      patch.transformFormat = field.phoneFormat ?? field.transformFormat ?? '(xxx) xxx-xxxx';
    } else if (field.transformType === 'date' || field.transformType === 'currency' || field.transformType === 'phone') {
      patch.transformType = 'none';
      patch.transformFormat = undefined;
    }

    if (BOXED_TEXT_DISABLED_TYPES.includes(nextType)) {
      patch.boxedTextEnabled = false;
      patch.boxInputMode = undefined;
      patch.boxPattern = undefined;
    } else if (BOXED_TEXT_AUTO_TYPES.includes(nextType)) {
      const defaults = BOXED_TEXT_DEFAULTS[nextType];
      patch.boxedTextEnabled = true;
      patch.boxInputMode = defaults?.inputMode ?? 'digits';
      patch.boxPattern = defaults?.pattern ?? field.boxPattern;
    }

    return patch;
  };

  return (
    <div className="field-editor">
      <h3 className="fe-title">Edit Field</h3>

      <label className="fe-label" title="The original internal field name embedded in the PDF">PDF Source ID</label>
      <input
        className="fe-input"
        type="text"
        placeholder="e.g. form10page_10mailing_address0"
        value={field.sourceFieldId}
        onChange={(e) => {
          const sourceFieldId = e.target.value;
          update({ sourceFieldId, name: sourceFieldId });
        }}
      />

      <label className="fe-label">Semantic Key</label>
      <input
        className="fe-input"
        type="text"
        placeholder="e.g. applicant.mailingAddress"
        value={field.semanticKey}
        onChange={(e) => update({ semanticKey: e.target.value })}
      />

      <label className="fe-label">Display Label</label>
      <input
        className="fe-input"
        type="text"
        placeholder="e.g. Mailing Address"
        value={field.displayLabel}
        onChange={(e) => update({ displayLabel: e.target.value })}
      />

      <label className="fe-label">Type</label>
      <select
        className="fe-select"
        value={field.type}
        onChange={(e) => {
          const nextType = e.target.value as FieldType;
          update(buildTypePatch(nextType));
        }}
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
      
      {overflowWarning && (
        <div className="fe-warning">
          ⚠️ {overflowWarning}
        </div>
      )}

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

      <label className="fe-check-label">
        <input
          type="checkbox"
          checked={field.required ?? false}
          onChange={(e) => update({ required: e.target.checked })}
        />
        Required field
      </label>

      <label className="fe-label">Transform</label>
      <select
        className="fe-select"
        value={field.transformType ?? 'none'}
        onChange={(e) => {
          const transformType = e.target.value as NonNullable<Field['transformType']>;
          update({
            transformType,
            transformFormat:
              transformType === 'date'
                ? field.dateFormat ?? field.transformFormat ?? 'MM/DD/YYYY'
                : transformType === 'currency'
                  ? field.currencySymbol ?? field.transformFormat ?? 'USD'
                  : transformType === 'phone'
                    ? field.phoneFormat ?? field.transformFormat ?? '(xxx) xxx-xxxx'
                    : undefined,
          });
        }}
      >
        {TRANSFORM_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {(field.transformType === 'date' || field.type === 'date' || field.type === 'dob') && (
        <>
          <label className="fe-label">Date Format</label>
          <select
            className="fe-select"
            value={field.dateFormat ?? (field.transformFormat as Field['dateFormat']) ?? 'MM/DD/YYYY'}
            onChange={(e) => {
              const dateFormat = e.target.value as Field['dateFormat'];
              update({ dateFormat, transformFormat: dateFormat });
            }}
          >
            {DATE_FORMATS.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt}
              </option>
            ))}
          </select>
        </>
      )}

      {(field.transformType === 'currency' || field.type === 'currency') && (
        <>
          <label className="fe-label">Currency Symbol</label>
          <select
            className="fe-select"
            value={field.currencySymbol ?? 'USD'}
            onChange={(e) => {
              const currencySymbol = e.target.value as Field['currencySymbol'];
              update({ currencySymbol, transformFormat: currencySymbol });
            }}
          >
            {CURRENCY_SYMBOLS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </>
      )}

      {(field.transformType === 'phone' || field.type === 'phone') && (
        <>
          <label className="fe-label">Phone Format</label>
          <select
            className="fe-select"
            value={field.phoneFormat ?? '(xxx) xxx-xxxx'}
            onChange={(e) => {
              const phoneFormat = e.target.value as Field['phoneFormat'];
              update({ phoneFormat, transformFormat: phoneFormat });
            }}
          >
            {PHONE_FORMATS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </>
      )}

      {field.transformType === 'height' && (
        <>
          <label className="fe-label">Height Format</label>
          <select
            className="fe-select"
            value={field.heightFormat ?? 'inches'}
            onChange={(e) => update({ heightFormat: e.target.value as Field['heightFormat'] })}
          >
            {HEIGHT_FORMATS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label className="fe-label">Height Storage Unit</label>
          <select
            className="fe-select"
            value={field.heightStorageUnit ?? 'inches'}
            onChange={(e) => update({ heightStorageUnit: e.target.value as Field['heightStorageUnit'] })}
          >
            {HEIGHT_STORAGE_UNITS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </>
      )}

      {field.transformType === 'weight' && (
        <>
          <label className="fe-label">Weight Format</label>
          <select
            className="fe-select"
            value={field.weightFormat ?? 'lbs'}
            onChange={(e) => update({ weightFormat: e.target.value as Field['weightFormat'] })}
          >
            {WEIGHT_FORMATS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label className="fe-label">Weight Storage Unit</label>
          <select
            className="fe-select"
            value={field.weightStorageUnit ?? 'lbs'}
            onChange={(e) => update({ weightStorageUnit: e.target.value as Field['weightStorageUnit'] })}
          >
            {WEIGHT_STORAGE_UNITS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </>
      )}

      {field.transformType === 'state' && (
        <>
          <label className="fe-label">State Format</label>
          <select
            className="fe-select"
            value={field.stateFormat ?? 'abbreviation'}
            onChange={(e) => update({ stateFormat: e.target.value as Field['stateFormat'] })}
          >
            {STATE_FORMATS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </>
      )}

      <label className="fe-label">Spacing Strategy</label>
      <select
        className="fe-select"
        value={field.presentationSpacingStrategy ?? 'semantic'}
        onChange={(e) =>
          update({
            presentationSpacingStrategy: e.target.value as Field['presentationSpacingStrategy'],
          })
        }
      >
        {PRESENTATION_SPACING_STRATEGIES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <label className="fe-label">Presentation Overflow</label>
      <select
        className="fe-select"
        value={field.presentationOverflowStrategy ?? 'reflow'}
        onChange={(e) =>
          update({
            presentationOverflowStrategy: e.target.value as Field['presentationOverflowStrategy'],
          })
        }
      >
        {PRESENTATION_OVERFLOW_STRATEGIES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {!boxedTextDisabled && (
        <>
          <label className="fe-check-label">
            <input
              type="checkbox"
              checked={field.boxedTextEnabled ?? BOXED_TEXT_AUTO_TYPES.includes(field.type)}
              onChange={(e) => {
                const enabled = e.target.checked;
                if (!enabled) {
                  update({
                    boxedTextEnabled: false,
                    boxInputMode: undefined,
                    boxPattern: undefined,
                  });
                  return;
                }
                const defaults = BOXED_TEXT_DEFAULTS[field.type];
                update({
                  boxedTextEnabled: true,
                  boxInputMode: field.boxInputMode ?? defaults?.inputMode ?? 'digits',
                  boxPattern: field.boxPattern ?? defaults?.pattern ?? '1',
                });
              }}
            />
            Boxed Text Mode
          </label>

          {(field.boxedTextEnabled ?? BOXED_TEXT_AUTO_TYPES.includes(field.type)) && (
            <>
              <label className="fe-label">Box Input Mode</label>
              <select
                className="fe-select"
                value={field.boxInputMode ?? BOXED_TEXT_DEFAULTS[field.type]?.inputMode ?? 'digits'}
                onChange={(e) => update({ boxInputMode: e.target.value as Field['boxInputMode'] })}
              >
                {BOX_INPUT_MODES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <label className="fe-label">Box Pattern</label>
              <input
                className="fe-input"
                type="text"
                placeholder="e.g. 3-2-4"
                value={field.boxPattern ?? BOXED_TEXT_DEFAULTS[field.type]?.pattern ?? ''}
                onChange={(e) => update({ boxPattern: e.target.value })}
              />
            </>
          )}
        </>
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
