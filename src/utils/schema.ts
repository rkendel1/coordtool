import {
  Field,
  LayoutEntry,
  MappingArtifact,
  MappingDefinition,
  TransformEntry,
  TableDefinition,
} from '../types/Field';

interface CapabilityManifest {
  kind: 'capability';
  schemaVersion: '1.0';
  id: string;
  name: string;
  domain: string;
  type: string;
  artifacts: {
    template: string;
    layout: string;
    mapping: string;
    transforms: string;
    fields: string;
    questions: string;
    validation: string;
  };
  capabilities: string[];
}

interface ValidationSchema {
  schemaVersion: '1.0';
  rules: Array<{
    field: string;
    required: boolean;
  }>;
}

interface LayoutArtifact {
  schemaVersion: '1.0';
  layout: Record<string, LayoutEntry>;
}

interface TransformsArtifact {
  schemaVersion: '1.0';
  transforms: Record<string, TransformEntry>;
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
  schemaVersion: '1.0';
  capability: string;
  questions: QuestionSchema[];
}

interface QuestionSchema {
  id: string;
  field: {
    semanticKey: string;
    target: string;
  };
  prompt: {
    question: string;
    helpText: string;
  };
  type: {
    input: string;
  };
  validation: string[];
}

interface GenerateQuestionsOptions {
  useOllama?: boolean;
  ollamaModel?: string;
  capability?: string;
}

interface GenerateManifestOptions {
  capability?: string;
  name?: string;
}

interface GenerateMappingOptions {
  capability?: string;
}

function normalizeCapability(capability?: string): string {
  if (!capability || !capability.trim()) return 'capability.unknown';
  return capability.trim().toLowerCase();
}

function capabilityToDisplayName(capability: string): string {
  const words = capability
    .split('.')
    .filter(Boolean)
    .map((word) => word.toUpperCase());
  if (words.length === 0) return 'Capability Completion';
  return `${words.join(' ')} Completion`;
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
  return {
    schemaVersion: '1.0',
    layout: generateLayout(fields),
  };
}

/** Generate a canonical mapping scaffold. */
export function generateMapping(
  fields: Field[],
  options: GenerateMappingOptions = {}
): MappingArtifact {
  const capability = normalizeCapability(options.capability);
  const mappings: MappingDefinition[] = fields
    .filter(
      (field) =>
        field.sourceFieldId.trim() !== '' &&
        field.semanticKey.trim() !== '' &&
        field.displayLabel.trim() !== ''
    )
    .map((field) => {
      return {
        id: toMappingId(field.semanticKey),
        semantic: {
          key: field.semanticKey,
          label: field.displayLabel,
          type: inferSemanticType(field),
        },
        target: {
          field: field.sourceFieldId,
          layoutReference: field.sourceFieldId,
        },
        transform: mappingTransformsForField(field),
      };
    });

  return {
    schemaVersion: '1.0',
    artifactType: 'field-mapping',
    capability,
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

export function generateTransformsArtifact(fields: Field[]): TransformsArtifact {
  return {
    schemaVersion: '1.0',
    transforms: generateTransforms(fields),
  };
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
    schemaVersion: '1.0',
    id: capability,
    name: options.name?.trim() || capabilityToDisplayName(capability),
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
  };
}

/** Generate required-field validation schema scaffold. */
export function generateValidation(fields: Field[]): ValidationSchema {
  const requiredFields = fields
    .filter((field) => field.semanticKey.trim() !== '' && (field.required ?? false))
    .map((field) => field.semanticKey);

  return {
    schemaVersion: '1.0',
    rules: requiredFields.map((fieldName) => ({
      field: fieldName,
      required: true,
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

function mappingTransformsForField(field: Field): Array<{ type: string; format?: string }> {
  const resolvedTransform = resolveFieldTransform(field);
  return resolvedTransform ? [resolvedTransform] : [];
}

function toMappingId(fieldName: string): string {
  const slug = fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `mapping-${slug || 'field'}`;
}

function inferInputType(field: Field): string {
  if (field.type === 'checkbox') return 'boolean';
  if (field.type === 'phone') return 'phone';
  if (field.type === 'date') return 'date';
  if (field.type === 'dob') return 'date';
  if (field.type === 'currency') return 'currency';
  if (field.type === 'table') return 'table';
  return 'text';
}

function inferSemanticType(field: Field): string {
  const key = `${field.semanticKey} ${field.displayLabel}`.toLowerCase();
  if (/(address|street|city|state|zip|postal|county)/.test(key)) return 'address';
  return inferInputType(field);
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

function defaultRules(field: Field): string[] {
  const required = field.required ?? false;

  if (field.type === 'date') {
    return required
      ? ['non_empty', 'date_format:MM/DD/YYYY']
      : ['date_format:MM/DD/YYYY'];
  }
  if (field.type === 'currency') {
    return required ? ['non_empty', 'currency'] : ['currency'];
  }
  if (field.type === 'checkbox') return ['boolean'];

  const base = [`max_length:${Math.max(1, Math.round(field.maxWidth ?? 175))}`];
  return required ? ['non_empty', ...base] : base;
}

function buildFallbackQuestions(
  fields: Field[],
  capability?: string
): QuestionExportSchema {
  const resolvedCapability = normalizeCapability(capability);
  const questions = fields
    .filter(
      (field) =>
        field.sourceFieldId.trim() !== '' &&
        field.semanticKey.trim() !== '' &&
        field.displayLabel.trim() !== ''
    )
    .map((field): QuestionSchema => {
      const label = field.displayLabel;
      const target = field.sourceFieldId;

      return {
        id: field.sourceFieldId,
        field: {
          semanticKey: field.semanticKey,
          target,
        },
        prompt: {
          question: `What is the ${label.toLowerCase()}?`,
          helpText: `Enter the applicant ${label.toLowerCase()}.`,
        },
        type: {
          input: inferSemanticType(field),
        },
        validation: defaultRules(field),
      };
    });

  return {
    schemaVersion: '1.0',
    capability: resolvedCapability,
    questions,
  };
}

function extractFirstJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function normalizeQuestionWithFieldFallback(
  question: any,
  field: Field,
  capability?: string
): QuestionSchema {
  void capability;
  const label = field.displayLabel;
  const target = field.sourceFieldId;
  return {
    id: typeof question?.id === 'string' && question.id ? question.id : field.sourceFieldId,
    field: {
      semanticKey: question?.field?.semanticKey ?? field.semanticKey,
      target: question?.field?.target ?? target,
    },
    prompt: {
      question: question?.prompt?.question ?? `What is the ${label.toLowerCase()}?`,
      helpText: question?.prompt?.helpText ?? `Enter the applicant ${label.toLowerCase()}.`,
    },
    type: {
      input: question?.type?.input ?? inferSemanticType(field),
    },
    validation: Array.isArray(question?.validation)
      ? question.validation
      : Array.isArray(question?.validation?.rules)
        ? question.validation.rules
        : defaultRules(field),
  };
}

async function generateQuestionsWithOllama(
  fields: Field[],
  model = 'llama3.1:8b',
  capability?: string
): Promise<QuestionExportSchema> {
  const resolvedCapability = normalizeCapability(capability);
  const namedFields = fields.filter(
    (f) =>
      f.sourceFieldId.trim() !== '' &&
      f.semanticKey.trim() !== '' &&
      f.displayLabel.trim() !== ''
  );
  const fallback = buildFallbackQuestions(namedFields, resolvedCapability);
  const fieldSpec = namedFields
    .map((f) => ({
      sourceFieldId: f.sourceFieldId,
      semanticKey: f.semanticKey,
      displayLabel: f.displayLabel,
      type: f.type,
      page: f.page + 1,
    }));

  const prompt = [
    'Generate JSON only. No markdown. No explanation.',
    'Return a single JSON object with keys: schemaVersion, capability, questions.',
    `schemaVersion must be "1.0" and capability must be "${resolvedCapability}".`,
    'Create exactly one question per provided field and preserve field mapping to each target field.',
    'Each question must include: id, field.semanticKey, field.target, prompt.question, prompt.helpText, type.input, validation.',
    'Field list JSON:',
    JSON.stringify(fieldSpec),
    'Set field.target to sourceFieldId exactly.',
  ].join('\n');

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.2 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const raw = typeof payload?.response === 'string' ? payload.response : '';
  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) {
    throw new Error('Ollama returned non-JSON output');
  }

  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed?.questions)) {
    throw new Error('Ollama output missing questions array');
  }

  const normalizedQuestions = fallback.questions.map((_, index) =>
    normalizeQuestionWithFieldFallback(
      parsed.questions[index],
      namedFields[index],
      resolvedCapability
    )
  );

  return {
    schemaVersion: '1.0',
    capability: resolvedCapability,
    questions: normalizedQuestions,
  };
}

/**
 * Generate field-linked questions. Uses local Ollama when available and
 * falls back to deterministic generation if unavailable.
 */
export async function generateQuestions(
  fields: Field[],
  options: GenerateQuestionsOptions = {}
): Promise<QuestionExportSchema> {
  const useOllama = options.useOllama ?? true;
  const capability = normalizeCapability(options.capability);
  if (!useOllama) {
    return buildFallbackQuestions(fields, capability);
  }

  try {
    return await generateQuestionsWithOllama(fields, options.ollamaModel, capability);
  } catch {
    return buildFallbackQuestions(fields, capability);
  }
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
