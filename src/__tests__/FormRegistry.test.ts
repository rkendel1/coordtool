import { FormRegistry } from '../registry/FormRegistry';
import { LayoutEntry, MappingSchema, TransformEntry } from '../types/Field';

describe('FormRegistry', () => {
  let registry: FormRegistry;

  beforeEach(() => {
    registry = new FormRegistry();
  });

  it('registers a form bundle', () => {
    const bundle = {
      id: 'test-form',
      name: 'Test Form',
      version: 'v1',
      schema: {
        layout: {},
        mapping: {},
        transforms: {},
      },
    };

    registry.register(bundle);

    expect(registry.hasForm('test-form')).toBe(true);
    expect(registry.getForm('test-form')).toEqual(bundle);
  });

  it('retrieves form schema by id', () => {
    const schema = {
      layout: { field1: {} as LayoutEntry },
      mapping: { field1: { target: 'field1', transform: [] } } as MappingSchema,
      transforms: { field1: {} as TransformEntry },
    };

    registry.register({
      id: 'test-form',
      name: 'Test Form',
      version: 'v1',
      schema,
    });

    expect(registry.getSchema('test-form')).toEqual(schema);
  });

  it('lists all registered forms', () => {
    registry.register({
      id: 'form1',
      name: 'Form 1',
      version: 'v1',
      schema: { layout: {}, mapping: {}, transforms: {} },
    });

    registry.register({
      id: 'form2',
      name: 'Form 2',
      version: 'v1',
      schema: { layout: {}, mapping: {}, transforms: {} },
    });

    const forms = registry.listForms();

    expect(forms).toHaveLength(2);
    expect(forms.map((f) => f.id)).toContain('form1');
    expect(forms.map((f) => f.id)).toContain('form2');
  });

  it('unregisters a form', () => {
    registry.register({
      id: 'test-form',
      name: 'Test Form',
      version: 'v1',
      schema: { layout: {}, mapping: {}, transforms: {} },
    });

    expect(registry.hasForm('test-form')).toBe(true);

    registry.unregister('test-form');

    expect(registry.hasForm('test-form')).toBe(false);
  });

  it('returns undefined for non-existent form', () => {
    expect(registry.getForm('non-existent')).toBeUndefined();
    expect(registry.getSchema('non-existent')).toBeUndefined();
  });

  it('loads form from files', async () => {
    const schemaData = {
      layout: {
        field1: {
          page: 0,
          x: 100,
          y: 200,
          width: 150,
          height: 20,
          type: 'text' as const,
          fontSize: 10,
          maxWidth: 150,
        },
      },
      mapping: {
        'data.field1': {
          target: 'field1',
          transform: [],
        },
      },
      transforms: {
        field1: {
          type: 'text',
        },
      },
    };

    await registry.loadFromFiles('acord-126', 'ACORD 126', 'v1', schemaData);

    expect(registry.hasForm('acord-126')).toBe(true);
    const form = registry.getForm('acord-126');
    expect(form?.name).toBe('ACORD 126');
    expect(form?.version).toBe('v1');
    expect(form?.schema).toEqual(schemaData);
  });
});
