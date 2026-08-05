import {
  Field,
  LayoutEntry,
  MappingArtifact,
  MappingDefinition,
  SemanticDataType,
  TransformEntry,
  TableDefinition,
} from '../types/Field';
import {
  canonicalDisplayLabel,
  descriptionFromSemanticKey,
  requiresSemanticCorrection,
} from './fieldNames';

const isCanonicalField = (field: Field) =>
  field.sourceFieldId.trim() !== '' &&
  field.semanticKey.trim() !== '' &&
  field.displayLabel.trim() !== '' &&
  !requiresSemanticCorrection(field);

function assertSemanticQuality(fields: Field[]): void {
  const leaked = fields.filter(requiresSemanticCorrection);
  if (leaked.length) {
    throw new Error(
      `Export blocked: ${leaked.length} field(s) still have non-canonical semantic keys.`
    );
  }
}

interface CapabilityManifest {
  kind: 'capability';
  manifestVersion: '1.0';
  version: '1.0.0';
  id: string;
  type: string;
  artifacts: {
    template: string;
    schema: string;
    questions: string;
    layout: string;
    mapping: string;
    transforms: string;
    validation: string;
  };
  capabilities: string[];
}

interface ValidationSchema {
  artifactType: 'validation';
  version: '1.0';
  rules: Array<{
    field: string;
    rule: 'required';
  }>;
}

interface DocumentLayoutField {
  sourceId: string;
  page: number;
  geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  render: {
    type: Field['type'];
    fontSize: number;
  };
}

interface LayoutArtifact {
  artifactType: 'document-layout';
  version: '1.0';
  pages: number;
  fields: Record<string, DocumentLayoutField>;
}

interface TransformsArtifact {
  formats: Partial<Record<'phone' | 'date' | 'currency', string>>;
}

interface FieldsArtifact {
  schemaVersion: '1.0';
  fields: Array<{
    id: string;
    sourceFieldId: string;
    semanticKey: string;
    displayLabel: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type: Field['type'];
    required?: boolean;
    transformType?: Field['transformType'];
    transformFormat?: string;
  }>;
}

interface QuestionExportSchema {
  artifactType: 'document-questions';
  version: '1.0';
  questions: QuestionSchema[];
}

interface QuestionSchema {
  id: string;
  semanticKey: string;
  prompt: {
    label: string;
    helpText: string;
  };
  input: {
    type: string;
  };
  required: boolean;
  order: number;
  group: string;
}

interface GenerateQuestionsOptions {
  useOllama?: boolean;
  ollamaModel?: string;
  capability?: string;
}

interface GenerateManifestOptions {
  capability?: string;
}

interface GenerateMappingOptions {
  capability?: string;
}

interface GenerateDocumentSchemaOptions {
  capability?: string;
  generatedAt?: string;
}

function normalizeCapability(capability?: string): string {
  if (!capability || !capability.trim()) return 'capability.unknown';
  return capability.trim().toLowerCase();
}

/** Generate the unified layout schema (single source of truth). */
export function generateLayout(fields: Field[]): Record<string, LayoutEntry> {
  const layout: Record<string, LayoutEntry> = {};
  for (const f of fields) {
    if (!f.sourceFieldId) continue;
    const entry: LayoutEntry = {
      page: f.page,
      x: Math.round(f.x),
      y: Math.round(f.y),
      width: Math.round(f.width),
      height: Math.round(f.height),
      type: f.type,
      fontSize: f.fontSize ?? 10,
      maxWidth: f.maxWidth ?? Math.round(f.width),
    };
    
    // Add optional overflow properties
    if (f.maxLines !== undefined) {
      entry.maxLines = f.maxLines;
    }
    if (f.overflowStrategy) {
      entry.overflowStrategy = f.overflowStrategy;
    }
    if (f.checkboxStyle) {
      entry.checkboxStyle = f.checkboxStyle;
    }
    
    layout[f.sourceFieldId] = entry;
  }
  return layout;
}

export function generateLayoutArtifact(fields: Field[]): LayoutArtifact {
  assertSemanticQuality(fields);
  const renderableFields = fields.filter(field =>
    isCanonicalField(field)
  );
  const artifactFields = Object.fromEntries(renderableFields.map((field, index) => [
    `field_${String(index + 1).padStart(3, '0')}`,
    {
      sourceId: field.sourceFieldId,
      page: field.page,
      geometry: {
        x: Math.round(field.x),
        y: Math.round(field.y),
        width: Math.round(field.width),
        height: Math.round(field.height),
      },
      render: {
        type: field.type,
        fontSize: field.fontSize ?? 10,
      },
    },
  ]));

  return {
    artifactType: 'document-layout',
    version: '1.0',
    pages: renderableFields.length
      ? Math.max(...renderableFields.map(field => field.page)) + 1
      : 0,
    fields: artifactFields,
  };
}

/** Generate a canonical mapping scaffold. */
export function generateMapping(
  fields: Field[],
  options: GenerateMappingOptions = {}
): MappingArtifact {
  void options;
  assertSemanticQuality(fields);
  const mappableFields = fields.filter(isCanonicalField);
  const mappings: MappingDefinition[] = mappableFields.map((field, index) => ({
    id: `mapping_${String(index + 1).padStart(3, '0')}`,
    semanticKey: field.semanticKey,
    binding: {
      fieldId: `field_${String(index + 1).padStart(3, '0')}`,
      sourceId: field.sourceFieldId,
    },
  }));

  return {
    artifactType: 'field-mapping',
    version: '1.0',
    mappings,
  };
}

/** Generate transform hooks for date and currency fields. */
export function generateTransforms(
  fields: Field[]
): Record<string, TransformEntry> {
  const transforms: Record<string, TransformEntry> = {};
  for (const f of fields) {
    if (!f.semanticKey) continue;
    const resolvedTransform = resolveFieldTransform(f);
    if (resolvedTransform) {
      transforms[f.semanticKey] = resolvedTransform;
    }
  }
  return transforms;
}

/** Export declarative formats for Synapse; no executable transform behavior. */
export function generateTransformsArtifact(fields: Field[]): TransformsArtifact {
  assertSemanticQuality(fields);
  const formats: TransformsArtifact['formats'] = {};
  for (const field of fields.filter(isCanonicalField)) {
    const declaration = resolveFieldTransform(field);
    if (!declaration) continue;
    if (declaration.type === 'phone' && formats.phone === undefined) {
      formats.phone = declaration.format || '(xxx) xxx-xxxx';
    } else if (declaration.type === 'date' && formats.date === undefined) {
      formats.date = declaration.format || 'MM/DD/YYYY';
    } else if (declaration.type === 'currency' && formats.currency === undefined) {
      formats.currency = declaration.format || 'USD';
    }
  }
  return { formats };
}

/** Group table fields into table definitions. */
export function generateTables(
  fields: Field[]
): Record<string, TableDefinition> {
  const tables: Record<string, TableDefinition> = {};
  const tableFields = fields.filter((f) => f.type === 'table' && f.tableGroup);

  const groups: Record<string, Field[]> = {};
  for (const f of tableFields) {
    const g = f.tableGroup!;
    if (!groups[g]) groups[g] = [];
    groups[g].push(f);
  }

  for (const [group, cols] of Object.entries(groups)) {
    const sorted = [...cols].sort((a, b) => b.y - a.y); // highest y = lowest on screen
    const startY = Math.round(sorted[0].y);
    const rowHeight = sorted.length > 1
      ? Math.round(Math.abs(sorted[0].y - sorted[1].y))
      : 14;

    const columns: Record<string, { x: number }> = {};
    for (const c of cols) {
      columns[c.name] = { x: Math.round(c.x) };
    }

    tables[group] = {
      type: 'table',
      page: cols[0].page,
      startY,
      rowHeight,
      maxRows: 5,
      columns,
    };
  }

  return tables;
}

/** Generate capability manifest for exported schema bundles. */
export function generateManifest(
  options: GenerateManifestOptions = {}
): CapabilityManifest {
  const capability = normalizeCapability(options.capability);
  return {
    kind: 'capability',
    manifestVersion: '1.0',
    version: '1.0.0',
    id: capability,
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
  };
}

/** Generate required-field validation schema scaffold. */
export function generateValidation(fields: Field[]): ValidationSchema {
  assertSemanticQuality(fields);
  const requiredFields = fields
    .filter((field) => isCanonicalField(field) && (field.required ?? false))
    .map((field) => field.semanticKey);

  return {
    artifactType: 'validation',
    version: '1.0',
    rules: requiredFields.map((fieldName) => ({
      field: fieldName,
      rule: 'required',
    })),
  };
}

export function generateValidationArtifact(fields: Field[]): ValidationSchema {
  return generateValidation(fields);
}

export function generateFieldsArtifact(fields: Field[]): FieldsArtifact {
  const normalized = fields
    .filter(
      (field) =>
        field.sourceFieldId.trim() !== '' &&
        field.semanticKey.trim() !== '' &&
        field.displayLabel.trim() !== ''
    )
    .map((field) => ({
      id: field.id,
      sourceFieldId: field.sourceFieldId,
      semanticKey: field.semanticKey,
      displayLabel: field.displayLabel,
      page: field.page,
      x: Math.round(field.x),
      y: Math.round(field.y),
      width: Math.round(field.width),
      height: Math.round(field.height),
      type: field.type,
      required: field.required,
      transformType: field.transformType,
      transformFormat: field.transformFormat,
    }));

  return {
    schemaVersion: '1.0',
    fields: normalized,
  };
}

function inferSemanticType(field: Field): SemanticDataType {
  if (field.dataType) return field.dataType;
  const key = `${field.semanticKey} ${field.displayLabel}`.toLowerCase();
  if (/\b(e[- ]?mail|emailaddress)\b/.test(key)) return 'email';
  if (/\b(date\s*(?:and|&)\s*time|datetime|timestamp)\b/.test(key)) return 'datetime';
  if (/\b(mailing\s*address|street\s*address|address)\b/.test(key)) return 'address';
  if (/\b(date\s*of\s*birth|birth\s*date|marriage\s*date|date\s*of\s*marriage|effective\s*date|expiration\s*date)\b/.test(key)) return 'date';
  if (/\b(routing\s*(?:number|no)|account\s*(?:number|no)|identifier|identification|\bid\b|file\s*number|policy\s*number|zip|postal\s*code)\b/.test(key)) return 'identifier';
  if (/\b(name|first\s*name|last\s*name|full\s*name)\b/.test(key)) return 'text';
  if (field.type === 'checkbox') return 'boolean';
  if (field.type === 'date' || field.type === 'dob') return 'date';
  if (field.type === 'phone' || /\b(phone|telephone|fax)\b/.test(key)) return 'phone';
  if (field.type === 'currency') return 'currency';
  if (field.type === 'ssn' || /\b(ssn|social\s*security)\b/.test(key)) return 'ssn';
  if (field.type === 'ein' || field.type === 'zip') {
    return 'identifier';
  }
  if (/\b(amount|count|quantity|age|percentage|percent)\b/.test(key)) return 'number';
  return 'text';
}

function schemaFieldFormat(field: Field): { format?: { pattern: string } } {
  const declaration = resolveFieldTransform(field);
  if (!declaration || !['phone', 'date', 'currency'].includes(declaration.type)) return {};
  const fallback = declaration.type === 'phone'
    ? '(xxx) xxx-xxxx'
    : declaration.type === 'date'
      ? 'MM/DD/YYYY'
      : 'USD';
  return { format: { pattern: declaration.format || fallback } };
}

function resolveFieldTransform(field: Field): { type: string; format?: string } | null {
  if (field.transformType && field.transformType !== 'none') {
    if (field.transformType === 'date') {
      return {
        type: 'date',
        format: field.dateFormat || field.transformFormat || 'MM/DD/YYYY',
      };
    }
    if (field.transformType === 'currency') {
      return {
        type: 'currency',
        format: field.currencySymbol || field.transformFormat,
      };
    }
    if (field.transformType === 'phone') {
      return {
        type: 'phone',
        format: field.phoneFormat || field.transformFormat || '(xxx) xxx-xxxx',
      };
    }
    return { type: field.transformType };
  }

  if (field.type === 'date' || field.type === 'dob') {
    return { type: 'date', format: field.dateFormat || 'MM/DD/YYYY' };
  }
  if (field.type === 'currency') {
    return { type: 'currency', format: field.currencySymbol };
  }
  if (field.type === 'phone') {
    return { type: 'phone', format: field.phoneFormat || '(xxx) xxx-xxxx' };
  }
  return null;
}

/** Build question declarations directly from the canonical mapping order. */
export async function generateQuestions(
  fields: Field[],
  options: GenerateQuestionsOptions = {}
): Promise<QuestionExportSchema> {
  void options;
  assertSemanticQuality(fields);
  const mappableFields = fields.filter(isCanonicalField);
  const questions: QuestionSchema[] = [];
  const questionByKey = new Map<string, QuestionSchema>();
  for (const field of mappableFields) {
    const existing = questionByKey.get(field.semanticKey);
    if (existing) {
      existing.required = existing.required || (field.required ?? false);
      continue;
    }
    const question: QuestionSchema = {
        id: field.semanticKey,
        semanticKey: field.semanticKey,
        prompt: {
          label: canonicalDisplayLabel(field),
          helpText: field.description?.trim() || descriptionFromSemanticKey(field.semanticKey),
        },
        input: { type: inferSemanticType(field) },
        required: field.required ?? false,
        order: questions.length + 1,
        group: field.semanticKey.split('.')[0],
      };
    questions.push(question);
    questionByKey.set(field.semanticKey, question);
  }

  return {
    artifactType: 'document-questions',
    version: '1.0',
    questions,
  };
}

/** Export reusable canonical business fields only. */
export async function generateDocumentSchema(
  fields: Field[],
  options: GenerateDocumentSchemaOptions = {}
) {
  assertSemanticQuality(fields);
  const mappableFields = fields.filter(isCanonicalField);
  const semanticFields = new Map<string, typeof mappableFields[number]>();
  for (const field of mappableFields) {
    const existing = semanticFields.get(field.semanticKey);
    if (!existing) semanticFields.set(field.semanticKey, { ...field });
    else if (field.required) semanticFields.set(field.semanticKey, { ...existing, required: true });
  }

  return {
    artifactType: 'document-schema' as const,
    version: '1.0' as const,
    capability: normalizeCapability(options.capability),
    source: {
      generator: 'acord-exporter',
      version: '2.0',
      generatedAt: options.generatedAt || new Date().toISOString().slice(0, 10),
    },
    fields: Array.from(semanticFields.values()).map(field => ({
      semanticKey: field.semanticKey,
      displayLabel: canonicalDisplayLabel(field),
      description: field.description?.trim() || descriptionFromSemanticKey(field.semanticKey),
      dataType: inferSemanticType(field),
      cardinality: field.cardinality || 'single',
      ...schemaFieldFormat(field),
      required: field.required ?? false,
    })),
  };
}

/** Trigger a JSON file download in the browser. */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
