import {
  generateLayout,
  generateLayoutArtifact,
  generateManifest,
  generateMapping,
  generateFieldsArtifact,
  generateQuestions,
  generateTransforms,
  generateTransformsArtifact,
  generateValidation,
  generateValidationArtifact,
  generateTables,
} from '../utils/schema';
import { Field } from '../types/Field';

const makeField = (overrides: Partial<Field> = {}): Field => ({
  id: '1',
  name: 'form10page_10test_field0',
  sourceFieldId: 'form10page_10test_field0',
  semanticKey: 'applicant.testField',
  displayLabel: 'Test Field',
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
    const fields = [
      makeField({
        name: 'form10page_10applicant_name0',
        sourceFieldId: 'form10page_10applicant_name0',
      }),
    ];
    const layout = generateLayout(fields);
    expect(layout['form10page_10applicant_name0']).toMatchObject({
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
    const fields = [makeField({ sourceFieldId: '' })];
    const layout = generateLayout(fields);
    expect(Object.keys(layout)).toHaveLength(0);
  });
});

describe('generateLayoutArtifact', () => {
  it('adds schemaVersion envelope to layout export', () => {
    const fields = [makeField({ sourceFieldId: 'form10page_10applicant_name0' })];
    const artifact = generateLayoutArtifact(fields);

    expect(artifact.schemaVersion).toBe('1.0');
    expect(artifact.layout['form10page_10applicant_name0']).toBeDefined();
  });
});

describe('generateMapping', () => {
  it('creates mapping scaffold for named fields', () => {
    const fields = [
      makeField({
        sourceFieldId: 'form10page_10applicant_name0',
        semanticKey: 'applicant.name',
        displayLabel: 'Applicant Name',
      }),
    ];
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
        key: 'applicant.name',
        label: 'Applicant Name',
        type: 'text',
      },
      target: {
        field: 'form10page_10applicant_name0',
        layoutReference: 'form10page_10applicant_name0',
      },
      transform: [],
    });
    expect(Object.keys(mapping.mappings[0]).sort()).toEqual([
      'id',
      'semantic',
      'target',
      'transform',
    ]);
  });

  it('infers semantic type as address for address-like fields', () => {
    const fields = [
      makeField({
        sourceFieldId: 'form10page_10mailing_address0',
        semanticKey: 'applicant.mailingAddress',
        displayLabel: 'Mailing Address',
      }),
    ];
    const mapping = generateMapping(fields, { capability: 'carrier.form.001' });
    expect(mapping.mappings[0].semantic.type).toBe('address');
  });

  it('skips fields with empty names', () => {
    const fields = [makeField({ sourceFieldId: '' })];
    const mapping = generateMapping(fields, { capability: 'carrier.form.001' });
    expect(mapping.mappings).toHaveLength(0);
  });

  it('supports custom capability', () => {
    const fields = [makeField({ sourceFieldId: 'form10page_10agent_name0', semanticKey: 'applicant.agentName', displayLabel: 'Agent Name' })];
    const mapping = generateMapping(fields, { capability: 'carrier.form.130' });
    expect(mapping.capability).toBe('carrier.form.130');
  });
});

describe('generateTransforms', () => {
  it('generates date transform', () => {
    const fields = [makeField({ semanticKey: 'applicant.effectiveDate', type: 'date' })];
    const transforms = generateTransforms(fields);
    expect(transforms['applicant.effectiveDate']).toEqual({
      type: 'date',
      format: 'MM/DD/YYYY',
    });
  });

  it('generates currency transform', () => {
    const fields = [makeField({ semanticKey: 'applicant.premium', type: 'currency' })];
    const transforms = generateTransforms(fields);
    expect(transforms['applicant.premium']).toEqual({ type: 'currency' });
  });

  it('uses dotted semantic keys for underscored field names', () => {
    const fields = [
      makeField({ semanticKey: 'form10page.10date.of.death0', type: 'date' }),
    ];
    const transforms = generateTransforms(fields);

    expect(transforms['form10page.10date.of.death0']).toEqual({
      type: 'date',
      format: 'MM/DD/YYYY',
    });
  });

  it('does not generate transform for text fields', () => {
    const fields = [makeField({ semanticKey: 'applicant.someText', type: 'text' })];
    const transforms = generateTransforms(fields);
    expect(Object.keys(transforms)).toHaveLength(0);
  });

  it('supports custom transform selection from field settings', () => {
    const fields = [
      makeField({ semanticKey: 'applicant.officePhone', type: 'text', transformType: 'phone' }),
    ];
    const transforms = generateTransforms(fields);
    expect(transforms['applicant.officePhone']).toEqual({
      type: 'phone',
      format: '(xxx) xxx-xxxx',
    });
  });

  it('supports custom date format from field settings', () => {
    const fields = [
      makeField({
        name: 'effectiveDate',
        semanticKey: 'applicant.effectiveDate',
        type: 'date',
        transformType: 'date',
        transformFormat: 'YYYY-MM-DD',
      }),
    ];
    const transforms = generateTransforms(fields);
    expect(transforms['applicant.effectiveDate']).toEqual({
      type: 'date',
      format: 'YYYY-MM-DD',
    });
  });
});

describe('generateTransformsArtifact', () => {
  it('adds schemaVersion envelope to transforms export', () => {
    const fields = [makeField({ semanticKey: 'applicant.effectiveDate', type: 'date' })];
    const artifact = generateTransformsArtifact(fields);

    expect(artifact.schemaVersion).toBe('1.0');
    expect(artifact.transforms['applicant.effectiveDate']).toEqual({
      type: 'date',
      format: 'MM/DD/YYYY',
    });
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
      schemaVersion: '1.0',
      id: 'carrier.form.001',
      name: 'CARRIER FORM 001 Completion',
      domain: 'general',
      type: 'document-completion',
      artifacts: {
        template: 'template.pdf',
        layout: 'layout.json',
        mapping: 'mapping.json',
        transforms: 'transforms.json',
        fields: 'fields.json',
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

  it('keeps capability manifests domain neutral', () => {
    const manifest = generateManifest({ capability: 'va.22-5940' });
    expect(manifest.domain).toBe('general');
  });
});

describe('generateValidation', () => {
  it('generates required rules from field.required settings', () => {
    const validation = generateValidation([
      makeField({ sourceFieldId: 'form10page_10agent_name0', semanticKey: 'applicant.agentName', required: true }),
      makeField({ id: '2', sourceFieldId: 'form10page_10producer_name0', semanticKey: 'applicant.producerName', required: false }),
    ]);

    expect(validation).toEqual({
      schemaVersion: '1.0',
      rules: [
        {
          field: 'applicant.agentName',
          required: true,
        },
      ],
    });
  });

  it('returns no rules when no fields are marked required', () => {
    const validation = generateValidation([makeField({ sourceFieldId: 'form10page_10producer_name0' })]);

    expect(validation).toEqual({
      schemaVersion: '1.0',
      rules: [],
    });
  });
});

describe('generateValidationArtifact', () => {
  it('returns schemaVersion envelope for validation export', () => {
    const artifact = generateValidationArtifact([
      makeField({ semanticKey: 'applicant.agentName', required: true }),
    ]);
    expect(artifact.schemaVersion).toBe('1.0');
  });
});

describe('generateFieldsArtifact', () => {
  it('exports normalized fields.json payload', () => {
    const artifact = generateFieldsArtifact([
      makeField({
        id: 'f-1',
        sourceFieldId: 'form10page_10agent_name0',
        semanticKey: 'applicant.agentName',
        displayLabel: 'Agent Name',
        required: true,
      }),
    ]);

    expect(artifact.schemaVersion).toBe('1.0');
    expect(artifact.fields).toHaveLength(1);
    expect(artifact.fields[0]).toMatchObject({
      id: 'f-1',
      sourceFieldId: 'form10page_10agent_name0',
      semanticKey: 'applicant.agentName',
      displayLabel: 'Agent Name',
      required: true,
    });
  });
});

describe('generateQuestions', () => {
  it('generates question schema mapped to field targets', async () => {
    const fields = [
      makeField({ sourceFieldId: 'form10page_10agent_name0', semanticKey: 'applicant.agentName', displayLabel: 'Agent Name', type: 'text', page: 0 }),
      makeField({ id: '2', sourceFieldId: 'form10page_10mailing_address0', semanticKey: 'applicant.mailingAddress', displayLabel: 'Mailing Address', type: 'text', page: 1 }),
    ];

    const questionsJson = await generateQuestions(fields, {
      useOllama: false,
      capability: 'carrier.form.001',
    });

    expect(questionsJson.schemaVersion).toBe('1.0');
    expect(questionsJson.capability).toBe('carrier.form.001');
    expect(questionsJson.questions).toHaveLength(2);

    expect(questionsJson.questions[0]).toMatchObject({
      id: 'form10page_10agent_name0',
      field: {
        semanticKey: 'applicant.agentName',
        target: 'form10page_10agent_name0',
      },
      prompt: {
        question: 'What is the agent name?',
        helpText: 'Enter the applicant agent name.',
      },
      type: {
        input: 'text',
      },
      validation: ['max_length:200'],
    });

    expect(questionsJson.questions[1]).toMatchObject({
      field: {
        semanticKey: 'applicant.mailingAddress',
        target: 'form10page_10mailing_address0',
      },
      type: {
        input: 'address',
      },
    });
  });

  it('returns empty questions list when there are no named fields', async () => {
    const questionsJson = await generateQuestions([makeField({ sourceFieldId: '' })], {
      useOllama: false,
    });

    expect(questionsJson).toEqual({
      schemaVersion: '1.0',
      capability: 'capability.unknown',
      questions: [],
    });
  });

  it('does not use capability prefix in question field targets', async () => {
    const fields = [makeField({ sourceFieldId: 'form10page_10producer_name0', semanticKey: 'applicant.producerName', displayLabel: 'Producer Name', type: 'text' })];

    const questionsJson = await generateQuestions(fields, {
      useOllama: false,
      capability: 'carrier.form.126',
    });

    expect(questionsJson.capability).toBe('carrier.form.126');
    expect(questionsJson.questions[0].field.target).toBe('form10page_10producer_name0');
  });

  it('maintains semantic key relationship with mappings', async () => {
    const fields = [makeField({ sourceFieldId: 'form10page_10agent_name0', semanticKey: 'applicant.agentName', displayLabel: 'Agent Name', type: 'text' })];
    const mapping = generateMapping(fields, { capability: 'carrier.form.125' });
    const questionsJson = await generateQuestions(fields, {
      useOllama: false,
      capability: 'carrier.form.125',
    });

    expect(mapping.mappings[0].semantic.key).toBe('applicant.agentName');
    expect(questionsJson.questions[0].field.semanticKey).toBe('applicant.agentName');
    expect(questionsJson.questions[0].field.target).toBe('form10page_10agent_name0');
  });
});
