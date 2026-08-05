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
  generateDocumentSchema,
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
  it('exports rendering-only document geometry', () => {
    const fields = [makeField({
      sourceFieldId: 'form1[0].Page_1[0].Mailing_Address[0]',
      page: 0,
      x: 36,
      y: 550,
      width: 540,
      height: 36,
      type: 'multiline',
      fontSize: 10,
    })];
    const artifact = generateLayoutArtifact(fields);

    expect(artifact).toEqual({
      artifactType: 'document-layout',
      version: '1.0',
      pages: 1,
      fields: {
        field_001: {
          sourceId: 'form1[0].Page_1[0].Mailing_Address[0]',
          page: 0,
          geometry: { x: 36, y: 550, width: 540, height: 36 },
          render: { type: 'multiline', fontSize: 10 },
        },
      },
    });
    expect(artifact).not.toHaveProperty('schemaVersion');
    expect(artifact).not.toHaveProperty('layout');
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
      artifactType: 'field-mapping',
      version: '1.0',
    });
    expect(mapping.mappings).toHaveLength(1);
    expect(mapping.mappings[0]).toMatchObject({
      id: 'mapping_001',
      semanticKey: 'applicant.name',
      binding: {
        fieldId: 'field_001',
        sourceId: 'form10page_10applicant_name0',
      },
    });
    expect(Object.keys(mapping.mappings[0]).sort()).toEqual([
      'binding',
      'id',
      'semanticKey',
    ]);
  });

  it('binds address-like fields without owning their semantic type', () => {
    const fields = [
      makeField({
        sourceFieldId: 'form10page_10mailing_address0',
        semanticKey: 'applicant.mailingAddress',
        displayLabel: 'Mailing Address',
      }),
    ];
    const mapping = generateMapping(fields, { capability: 'carrier.form.001' });
    expect(mapping.mappings[0].binding).toEqual({
      fieldId: 'field_001',
      sourceId: 'form10page_10mailing_address0',
    });
  });

  it('skips fields with empty names', () => {
    const fields = [makeField({ sourceFieldId: '' })];
    const mapping = generateMapping(fields, { capability: 'carrier.form.001' });
    expect(mapping.mappings).toHaveLength(0);
  });

  it('does not include capability metadata', () => {
    const fields = [makeField({ sourceFieldId: 'form10page_10agent_name0', semanticKey: 'applicant.agentName', displayLabel: 'Agent Name' })];
    const mapping = generateMapping(fields, { capability: 'carrier.form.130' });
    expect(mapping).not.toHaveProperty('capability');
    expect(mapping).not.toHaveProperty('schemaVersion');
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
  it('exports declarative formatting rules separately from schema', () => {
    expect(generateTransformsArtifact([
      makeField({ id: 'phone', semanticKey: 'person.phone', type: 'phone' }),
      makeField({ id: 'date', semanticKey: 'person.birthDate', type: 'date' }),
      makeField({ id: 'currency', semanticKey: 'policy.premium', type: 'currency' }),
    ])).toEqual({
      formats: {
        phone: '(xxx) xxx-xxxx',
        date: 'MM/DD/YYYY',
        currency: 'USD',
      },
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
      manifestVersion: '1.0',
      version: '1.0.0',
      id: 'carrier.form.001',
      type: 'document-completion',
      artifacts: {
        template: 'template.pdf',
        schema: 'schema.json',
        questions: 'questions.json',
        layout: 'layout.json',
        mapping: 'mapping.json',
        transforms: 'transforms.json',
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
    expect(manifest.version).toBe('1.0.0');
  });
});

describe('generateValidation', () => {
  it('generates required rules from field.required settings', () => {
    const validation = generateValidation([
      makeField({ sourceFieldId: 'form10page_10agent_name0', semanticKey: 'applicant.agentName', required: true }),
      makeField({ id: '2', sourceFieldId: 'form10page_10producer_name0', semanticKey: 'applicant.producerName', required: false }),
    ]);

    expect(validation).toEqual({
      artifactType: 'validation',
      version: '1.0',
      rules: [
        {
          field: 'applicant.agentName',
          rule: 'required',
        },
      ],
    });
  });

  it('returns no rules when no fields are marked required', () => {
    const validation = generateValidation([makeField({ sourceFieldId: 'form10page_10producer_name0' })]);

    expect(validation).toEqual({
      artifactType: 'validation',
      version: '1.0',
      rules: [],
    });
  });
});

describe('generateValidationArtifact', () => {
  it('returns the versioned validation artifact', () => {
    const artifact = generateValidationArtifact([
      makeField({ semanticKey: 'applicant.agentName', required: true }),
    ]);
    expect(artifact).toEqual({
      artifactType: 'validation',
      version: '1.0',
      rules: [{ field: 'applicant.agentName', rule: 'required' }],
    });
    expect(JSON.stringify(artifact)).not.toContain('form10page_10test_field0');
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
  it('projects questions from canonical mappings', async () => {
    const fields = [
      makeField({
        sourceFieldId: 'form1[0].Page_1[0].Mailing_Address[0]',
        semanticKey: 'person.mailingAddress',
        displayLabel: 'Current mailing address',
        description: 'Applicant mailing address',
        type: 'text',
        required: false,
      }),
    ];

    expect(await generateQuestions(fields)).toEqual({
      artifactType: 'document-questions',
      version: '1.0',
      questions: [{
        id: 'person.mailingAddress',
        semanticKey: 'person.mailingAddress',
        prompt: {
          label: 'Current mailing address',
          helpText: 'Applicant mailing address',
        },
        input: { type: 'address' },
        required: false,
        order: 1,
        group: 'person',
      }],
    });
  });

  it('uses mapping order and required state', async () => {
    const fields = [
      makeField({ semanticKey: 'person.name', displayLabel: 'Name' }),
      makeField({
        id: '2', sourceFieldId: 'phone', semanticKey: 'person.phone',
        displayLabel: 'Phone', type: 'phone', required: true,
      }),
    ];
    const questionsJson = await generateQuestions(fields);
    expect(questionsJson.questions[1]).toEqual({
      id: 'person.phone',
      semanticKey: 'person.phone',
      prompt: { label: 'Phone', helpText: 'Person phone' },
      input: { type: 'phone' },
      required: true,
      order: 2,
      group: 'person',
    });
  });

  it('returns an empty artifact when there are no mappable fields', async () => {
    expect(await generateQuestions([
      makeField({ sourceFieldId: '' }),
    ])).toEqual({
      artifactType: 'document-questions',
      version: '1.0',
      questions: [],
    });
  });

  it('contains no PDF target or runtime behavior metadata', async () => {
    const questionsJson = await generateQuestions([
      makeField({ semanticKey: 'person.name', displayLabel: 'Name' }),
    ]);
    const question = questionsJson.questions[0] as any;
    expect(question).not.toHaveProperty('field');
    expect(question).not.toHaveProperty('target');
    expect(question).not.toHaveProperty('validation');
    expect(question).not.toHaveProperty('writesTo');
    expect(question).not.toHaveProperty('completion');
    expect(question).not.toHaveProperty('sources');
  });
});

describe('generateDocumentSchema', () => {
  it('contains canonical semantic fields only', async () => {
    const schema = await generateDocumentSchema([
      makeField({
        sourceFieldId: 'form1[0].Page_1[0].Mailing_Address[0]',
        semanticKey: 'person.mailingAddress',
        displayLabel: 'Current mailing address',
        description: 'Applicant mailing address',
        required: true,
      }),
    ], { capability: 'document.vba.22.5490.are', generatedAt: '2026-08-05' });

    expect(schema).toEqual({
      artifactType: 'document-schema',
      version: '1.0',
      capability: 'document.vba.22.5490.are',
      source: {
        generator: 'acord-exporter',
        version: '2.0',
        generatedAt: '2026-08-05',
      },
      fields: [{
        semanticKey: 'person.mailingAddress',
        displayLabel: 'Current mailing address',
        description: 'Applicant mailing address',
        dataType: 'address',
        cardinality: 'single',
        required: true,
      }],
    });
    expect(schema).not.toHaveProperty('questions');
  });

  it('places cardinality and format metadata on semantic fields', async () => {
    const schema = await generateDocumentSchema([
      makeField({
        sourceFieldId: 'phone_field',
        semanticKey: 'person.phone',
        displayLabel: 'Phone',
        type: 'phone',
        phoneFormat: '(xxx) xxx-xxxx',
        cardinality: 'multiple',
      }),
    ], { capability: 'document.contact', generatedAt: '2026-08-05' });

    expect(schema.fields[0]).toEqual({
      semanticKey: 'person.phone',
      displayLabel: 'Phone',
      description: 'Person phone',
      dataType: 'phone',
      cardinality: 'multiple',
      format: { pattern: '(xxx) xxx-xxxx' },
      required: false,
    });
  });

  it('deduplicates semantic keys while preserving every physical binding', async () => {
    const schema = await generateDocumentSchema([
      makeField({
        id: 'physical-1', sourceFieldId: 'radio_yes',
        semanticKey: 'claim.serviceMember.status', displayLabel: 'Service member status',
      }),
      makeField({
        id: 'physical-2', sourceFieldId: 'radio_no',
        semanticKey: 'claim.serviceMember.status', displayLabel: 'Service member status',
        required: true,
      }),
    ], { capability: 'document.test', generatedAt: '2026-08-05' });

    expect(schema.fields).toHaveLength(1);
    expect(schema.fields[0].required).toBe(true);
    const mapping = generateMapping([
      makeField({
        id: 'physical-1', sourceFieldId: 'radio_yes',
        semanticKey: 'claim.serviceMember.status', displayLabel: 'Service member status',
      }),
      makeField({
        id: 'physical-2', sourceFieldId: 'radio_no',
        semanticKey: 'claim.serviceMember.status', displayLabel: 'Service member status',
      }),
    ]);
    expect(mapping.mappings.map(entry => entry.binding)).toEqual([
      { fieldId: 'field_001', sourceId: 'radio_yes' },
      { fieldId: 'field_002', sourceId: 'radio_no' },
    ]);
  });

  it('does not export PDF-derived semantic keys', async () => {
    await expect(generateDocumentSchema([
      makeField({ semanticKey: 'data.form10Page10RadioButtonList' }),
    ], { capability: 'document.test', generatedAt: '2026-08-05' }))
      .rejects.toThrow('Export blocked');
  });

  it('does not promote PDF extraction labels into canonical schema fields', async () => {
    const schema = await generateDocumentSchema([
      makeField({
        semanticKey: 'applicant.relationship.status',
        displayLabel: 'Form1 0 Page 1 0 Radio Button List 0',
      }),
    ], { capability: 'document.test', generatedAt: '2026-08-05' });

    expect(schema.fields[0]).toMatchObject({
      semanticKey: 'applicant.relationship.status',
      displayLabel: 'Applicant Relationship Status',
      description: 'Applicant relationship status',
    });
    const questions = await generateQuestions([
      makeField({
        semanticKey: 'applicant.relationship.status',
        displayLabel: 'Form1 0 Page 1 0 Radio Button List 0',
      }),
    ]);
    expect(questions.questions[0].prompt.label).toBe('Applicant Relationship Status');
  });

  it('normalizes email before address and supports explicit controlled types', async () => {
    const schema = await generateDocumentSchema([
      makeField({
        id: 'email', sourceFieldId: 'email', semanticKey: 'applicant.emailAddress',
        displayLabel: 'EMAIL ADDRESS', type: 'text',
      }),
      makeField({
        id: 'status', sourceFieldId: 'status', semanticKey: 'applicant.relationship.status',
        displayLabel: 'Relationship status', type: 'text', dataType: 'enum',
      }),
    ], { capability: 'document.test', generatedAt: '2026-08-05' });

    expect(schema.fields.map(field => field.dataType)).toEqual(['email', 'enum']);
  });
});
