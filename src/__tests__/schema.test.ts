import {
  generateLayout,
  generateManifest,
  generateMapping,
  generateQuestions,
  generateTransforms,
  generateValidation,
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
    const mapping = generateMapping(fields, { capability: 'carrier.form.001' });

    expect(mapping).toMatchObject({
      schemaVersion: '1.0',
      artifactType: 'field-mapping',
      capability: 'carrier.form.001',
    });
    expect(mapping.mappings).toHaveLength(1);
    expect(mapping.mappings[0]).toMatchObject({
      id: 'mapping-applicant-name',
      semantic: {
        key: 'party.applicant.name',
        label: 'Applicant Name',
        type: 'text',
      },
      target: {
        field: 'applicantName',
        layoutReference: 'applicantName',
      },
      resolution: {
        priority: ['crm', 'organization.directory', 'user.input'],
      },
      transform: [],
      confidence: {
        score: 0.0,
        status: 'unverified',
      },
      status: 'suggested',
      suggestion: {
        source: 'crm.applicant.name',
        confidence: 0.92,
      },
    });
    expect(mapping.mappings[0].lifecycle).toEqual({
      states: ['discovered', 'suggested', 'reviewed', 'validated', 'active'],
      current: 'suggested',
    });
  });

  it('skips fields with empty names', () => {
    const fields = [makeField({ name: '' })];
    const mapping = generateMapping(fields, { capability: 'carrier.form.001' });
    expect(mapping.mappings).toHaveLength(0);
  });

  it('supports custom capability', () => {
    const fields = [makeField({ name: 'agentsname' })];
    const mapping = generateMapping(fields, { capability: 'carrier.form.130' });
    expect(mapping.capability).toBe('carrier.form.130');
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

describe('generateManifest', () => {
  it('matches expected capability manifest shape', () => {
    const manifest = generateManifest({ capability: 'carrier.form.001' });

    expect(manifest).toEqual({
      kind: 'capability',
      id: 'carrier.form.001',
      name: 'CARRIER FORM 001 Completion',
      version: '1.0.0',
      domain: 'insurance',
      type: 'document-completion',
      assets: {
        template: 'template.pdf',
        layout: 'layout.json',
        mapping: 'mapping.json',
        transforms: 'transforms.json',
        questions: 'questions.json',
        validation: 'validation.json',
      },
      capabilities: [
        'form.fill',
        'document.overlay',
        'field.mapping',
        'document.validation',
      ],
    });
  });

  it('supports custom capability ids', () => {
    const manifest = generateManifest({ capability: 'carrier.form.130' });

    expect(manifest.id).toBe('carrier.form.130');
    expect(manifest.name).toBe('CARRIER FORM 130 Completion');
  });
});

describe('generateValidation', () => {
  it('generates required rule for agentsname', () => {
    const validation = generateValidation([makeField({ name: 'agentsname' })]);

    expect(validation).toEqual({
      rules: [
        {
          field: 'agentsname',
          required: true,
        },
      ],
    });
  });

  it('falls back to agentsname when the field is not present', () => {
    const validation = generateValidation([makeField({ name: 'producerName' })]);

    expect(validation).toEqual({
      rules: [
        {
          field: 'agentsname',
          required: true,
        },
      ],
    });
  });
});

describe('generateQuestions', () => {
  it('generates question schema mapped to field targets', async () => {
    const fields = [
      makeField({ name: 'agentsname', type: 'text', page: 0 }),
      makeField({ id: '2', name: 'insuredAddress', type: 'text', page: 1 }),
    ];

    const questionsJson = await generateQuestions(fields, {
      useOllama: false,
      capability: 'carrier.form.001',
    });

    expect(questionsJson.schemaVersion).toBe('1.0');
    expect(questionsJson.capability).toBe('carrier.form.001');
    expect(questionsJson.questions).toHaveLength(2);

    expect(questionsJson.questions[0]).toMatchObject({
      id: 'q-agentsname',
      canonicalKey: 'party.agent.name',
      label: 'Agentsname',
      section: 'Applicant Information',
      required: true,
      sources: ['crm.customer', 'organization.directory', 'previous_submission'],
      targetField: 'form.carrierform001.agentsname',
      completionBehavior: {
        allowInference: true,
        allowLookup: true,
        writesTo: ['form.carrierform001.agentsname'],
      },
      questionClass: 'identity',
      field: {
        canonicalKey: 'party.agent.name',
        target: 'form.carrierform001.agentsname',
      },
      requirements: {
        required: true,
        confidenceRequired: 0.95,
      },
      completion: {
        writesTo: ['form.carrierform001.agentsname'],
      },
    });

    expect(questionsJson.questions[1]).toMatchObject({
      questionClass: 'address',
      field: {
        target: 'form.carrierform001.insuredaddress',
      },
    });
  });

  it('returns empty questions list when there are no named fields', async () => {
    const questionsJson = await generateQuestions([makeField({ name: '' })], {
      useOllama: false,
    });

    expect(questionsJson).toEqual({
      schemaVersion: '1.0',
      capability: 'capability.unknown',
      questions: [],
    });
  });

  it('uses form-specific target prefix from capability', async () => {
    const fields = [makeField({ name: 'producerName', type: 'text' })];

    const questionsJson = await generateQuestions(fields, {
      useOllama: false,
      capability: 'carrier.form.126',
    });

    expect(questionsJson.capability).toBe('carrier.form.126');
    expect(questionsJson.questions[0].field.target).toBe('form.carrierform126.producername');
    expect(questionsJson.questions[0].completion.writesTo).toEqual([
      'form.carrierform126.producername',
    ]);
    expect(questionsJson.questions[0].targetField).toBe('form.carrierform126.producername');
  });

  it('maintains semantic key relationship with mappings', async () => {
    const fields = [makeField({ name: 'agentsname', type: 'text' })];
    const mapping = generateMapping(fields, { capability: 'carrier.form.125' });
    const questionsJson = await generateQuestions(fields, {
      useOllama: false,
      capability: 'carrier.form.125',
    });

    expect(mapping.mappings[0].semantic.key).toBe('party.agent.name');
    expect(questionsJson.questions[0].field.canonicalKey).toBe('party.agent.name');
    expect(questionsJson.questions[0].field.target).toBe('form.carrierform125.agentsname');
  });
});
