import {
  generateLayout,
  generateMapping,
  generateTransforms,
  generateTables,
} from '../utils/schema';
import { Field } from '../types/Field';

const makeField = (overrides: Partial<Field> = {}): Field => ({
  id: '1',
  name: 'testField',
  page: 0,
  x: 100,
  y: 700,
  width: 200,
  height: 14,
  type: 'text',
  fontSize: 10,
  maxWidth: 200,
  ...overrides,
});

describe('generateLayout', () => {
  it('creates layout entry for a named field', () => {
    const fields = [makeField({ name: 'applicantName' })];
    const layout = generateLayout(fields);
    expect(layout['applicantName']).toMatchObject({
      page: 0,
      x: 100,
      y: 700,
      width: 200,
      height: 14,
      type: 'text',
      fontSize: 10,
      maxWidth: 200,
    });
  });

  it('skips fields with empty names', () => {
    const fields = [makeField({ name: '' })];
    const layout = generateLayout(fields);
    expect(Object.keys(layout)).toHaveLength(0);
  });
});

describe('generateMapping', () => {
  it('creates mapping scaffold for named fields', () => {
    const fields = [makeField({ name: 'applicantName' })];
    const mapping = generateMapping(fields);
    expect(mapping['TODO.applicantName']).toEqual({
      target: 'applicantName',
      transform: [],
    });
  });

  it('skips fields with empty names', () => {
    const fields = [makeField({ name: '' })];
    const mapping = generateMapping(fields);
    expect(Object.keys(mapping)).toHaveLength(0);
  });
});

describe('generateTransforms', () => {
  it('generates date transform', () => {
    const fields = [makeField({ name: 'effectiveDate', type: 'date' })];
    const transforms = generateTransforms(fields);
    expect(transforms['effectiveDate']).toEqual({
      type: 'date',
      format: 'MM/DD/YYYY',
    });
  });

  it('generates currency transform', () => {
    const fields = [makeField({ name: 'premium', type: 'currency' })];
    const transforms = generateTransforms(fields);
    expect(transforms['premium']).toEqual({ type: 'currency' });
  });

  it('does not generate transform for text fields', () => {
    const fields = [makeField({ name: 'someText', type: 'text' })];
    const transforms = generateTransforms(fields);
    expect(Object.keys(transforms)).toHaveLength(0);
  });
});

describe('generateTables', () => {
  it('groups table fields by tableGroup', () => {
    const fields: Field[] = [
      makeField({ id: '1', name: 'street', type: 'table', tableGroup: 'locations', x: 100, y: 500 }),
      makeField({ id: '2', name: 'city', type: 'table', tableGroup: 'locations', x: 250, y: 500 }),
    ];
    const tables = generateTables(fields);
    expect(tables['locations']).toBeDefined();
    expect(tables['locations'].type).toBe('table');
    expect(tables['locations'].columns).toHaveProperty('street');
    expect(tables['locations'].columns).toHaveProperty('city');
  });

  it('returns empty object if no table fields', () => {
    const fields = [makeField({ type: 'text' })];
    const tables = generateTables(fields);
    expect(Object.keys(tables)).toHaveLength(0);
  });
});
