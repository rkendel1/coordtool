import {
  resolveValue,
  applyTransforms,
  wrapText,
  handleMultilineOverflow,
} from '../renderer/pdfRenderer';
import { MappingArtifact, TransformEntry } from '../types/Field';

describe('resolveValue', () => {
  it('resolves simple data path', () => {
    const mapping: MappingArtifact = {
      schemaVersion: '1.0',
      artifactType: 'field-mapping',
      capability: 'carrier.form.001',
      mappings: [
        {
          id: 'mapping-applicant-name',
          semantic: { key: 'applicant.name', label: 'Applicant Name', type: 'text' },
          target: { field: 'applicantName', layoutReference: 'applicantName' },
          transform: [],
        },
      ],
    };
    const data = {
      applicant: { name: 'John Doe' },
    };
    
    expect(resolveValue(mapping, data, 'applicantName')).toBe('John Doe');
  });

  it('resolves nested data path', () => {
    const mapping: MappingArtifact = {
      schemaVersion: '1.0',
      artifactType: 'field-mapping',
      capability: 'carrier.form.001',
      mappings: [
        {
          id: 'mapping-policy-address-city',
          semantic: { key: 'policy.address.city', label: 'City', type: 'text' },
          target: { field: 'city', layoutReference: 'city' },
          transform: [],
        },
      ],
    };
    const data = {
      policy: { address: { city: 'New York' } },
    };
    
    expect(resolveValue(mapping, data, 'city')).toBe('New York');
  });

  it('returns undefined for missing mapping', () => {
    const mapping: MappingArtifact = {
      schemaVersion: '1.0',
      artifactType: 'field-mapping',
      capability: 'carrier.form.001',
      mappings: [],
    };
    const data = {};
    
    expect(resolveValue(mapping, data, 'missing')).toBeUndefined();
  });

  it('handles semantic keys with nested paths', () => {
    const mapping: MappingArtifact = {
      schemaVersion: '1.0',
      artifactType: 'field-mapping',
      capability: 'carrier.form.001',
      mappings: [
        {
          id: 'mapping-applicant-name',
          semantic: { key: 'applicant.name', label: 'Applicant Name', type: 'text' },
          target: { field: 'applicantName', layoutReference: 'applicantName' },
          transform: [],
        },
      ],
    };
    const data = {
      applicant: { name: 'Jane Smith' },
    };
    
    expect(resolveValue(mapping, data, 'applicantName')).toBe('Jane Smith');
  });

  it('resolves value from mapping artifact semantic key', () => {
    const mapping: MappingArtifact = {
      schemaVersion: '1.0',
      artifactType: 'field-mapping',
      capability: 'acord.form.125',
      mappings: [
        {
          id: 'mapping-agent-name',
          semantic: {
            key: 'party.agent.name',
            label: 'Agent Name',
            type: 'text',
          },
          target: {
            field: 'agentsname',
            layoutReference: 'agentsname',
          },
          transform: [],
        },
      ],
    };

    const data = {
      party: {
        agent: {
          name: 'Morgan Agent',
        },
      },
    };

    expect(resolveValue(mapping, data, 'agentsname')).toBe('Morgan Agent');
  });
});

describe('applyTransforms', () => {
  it('applies date transform', () => {
    const transforms: Record<string, TransformEntry> = {
      effectiveDate: { type: 'date', format: 'MM/DD/YYYY' },
    };
    const date = new Date('2024-03-15T12:00:00Z');
    
    expect(applyTransforms('effectiveDate', date, transforms)).toBe('03/15/2024');
  });

  it('applies currency transform', () => {
    const transforms: Record<string, TransformEntry> = {
      premium: { type: 'currency' },
    };
    
    expect(applyTransforms('premium', 1234.56, transforms)).toBe('$1,234.56');
  });

  it('returns string for no transform', () => {
    const transforms: Record<string, TransformEntry> = {};
    
    expect(applyTransforms('field', 'value', transforms)).toBe('value');
  });

  it('returns empty string for null/undefined', () => {
    const transforms: Record<string, TransformEntry> = {};
    
    expect(applyTransforms('field', null, transforms)).toBe('');
    expect(applyTransforms('field', undefined, transforms)).toBe('');
  });

  it('resolves dotted semantic transform keys for underscored field names', () => {
    const transforms: Record<string, TransformEntry> = {
      'form10page.10date.of.death0': { type: 'date', format: 'MM/DD/YYYY' },
    };
    const date = new Date('2024-03-15T12:00:00Z');

    expect(
      applyTransforms('form10page_10date_of_death0', date, transforms)
    ).toBe('03/15/2024');
  });
});

describe('wrapText', () => {
  it('wraps text to fit maxWidth', () => {
    const text = 'This is a long text that needs to be wrapped';
    const lines = wrapText(text, 100, 10);
    
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].length).toBeLessThanOrEqual(20); // ~100 / (10 * 0.5)
  });

  it('returns single line for short text', () => {
    const text = 'Short text';
    const lines = wrapText(text, 200, 10);
    
    expect(lines).toEqual(['Short text']);
  });

  it('handles empty text', () => {
    const lines = wrapText('', 100, 10);
    
    expect(lines).toEqual([]);
  });
});

describe('handleMultilineOverflow', () => {
  it('truncates lines with ellipsis', () => {
    const lines = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
    const result = handleMultilineOverflow(lines, 2, 'truncate');
    
    expect(result).toEqual(['Line 1', 'Line 2...']);
  });

  it('returns all lines when under maxLines', () => {
    const lines = ['Line 1', 'Line 2'];
    const result = handleMultilineOverflow(lines, 5, 'truncate');
    
    expect(result).toEqual(['Line 1', 'Line 2']);
  });

  it('returns all lines with continue strategy', () => {
    const lines = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
    const result = handleMultilineOverflow(lines, 2, 'continue');
    
    expect(result).toEqual(lines);
  });

  it('handles shrink strategy', () => {
    const lines = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
    const result = handleMultilineOverflow(lines, 2, 'shrink');
    
    expect(result.length).toBe(2);
  });

  it('returns all lines when maxLines is undefined', () => {
    const lines = ['Line 1', 'Line 2', 'Line 3'];
    const result = handleMultilineOverflow(lines, undefined, 'truncate');
    
    expect(result).toEqual(lines);
  });
});
