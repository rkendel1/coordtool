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
  id: string;
  name: string;
  version: string;
  domain: string;
  type: string;
  assets: {
    template: string;
    layout: string;
    mapping: string;
    transforms: string;
    questions: string;
    validation: string;
  };
  capabilities: string[];
}

interface ValidationSchema {
  rules: Array<{
    field: string;
    required: boolean;
  }>;
}

type QuestionClass =
  | 'identity'
  | 'address'
  | 'contact'
  | 'financial'
  | 'risk'
  | 'compliance'
  | 'authorization'
  | 'preference'
  | 'confirmation'
  | 'exception';

interface QuestionExportSchema {
  schemaVersion: '1.0';
  capability: string;
  questions: QuestionSchema[];
}

interface QuestionSchema {
  id: string;
  canonicalKey: string;
  label: string;
  section: string;
  required: boolean;
  sources: string[];
  targetField: string;
  completionBehavior: {
    allowInference: boolean;
    allowLookup: boolean;
    writesTo: string[];
  };
  questionClass: QuestionClass;
  field: {
    canonicalKey: string;
    target: string;
  };
  prompt: {
    label: string;
    question: string;
    helpText: string;
  };
  type: {
    input: string;
    format: string | null;
  };
  context: {
    section: string;
    page: number;
    purpose: string;
  };
  requirements: {
    required: boolean;
    confidenceRequired: number;
  };
  resolution: {
    allowInference: boolean;
    allowLookup: boolean;
    sources: string[];
  };
  validation: {
    rules: string[];
  };
  completion: {
    writesTo: string[];
  };
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

function capabilityToTargetPrefix(capability?: string): string {
  const normalized = normalizeCapability(capability);
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  return `form.${compact || 'capabilityunknown'}`;
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
    if (!f.name) continue;
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
    
    layout[f.name] = entry;
  }
  return layout;
}

/** Generate a canonical mapping scaffold. */
export function generateMapping(
  fields: Field[],
  options: GenerateMappingOptions = {}
): MappingArtifact {
  const capability = normalizeCapability(options.capability);
  const mappings: MappingDefinition[] = fields
    .filter((field) => field.name.trim() !== '')
    .map((field) => {
      const label = toLabel(field.name);
      const semanticKey = toCanonicalKey(field.name);
      const sourcePath = toSourcePathFromSemanticKey(semanticKey);

      return {
        id: toMappingId(field.name),
        semantic: {
          key: semanticKey,
          label,
          type: inferInputType(field),
        },
        target: {
          field: field.name,
          layoutReference: field.name,
        },
        resolution: {
          sources: [
            {
              type: 'crm',
              path: sourcePath,
            },
            {
              type: 'organization.directory',
              path: sourcePath,
            },
            {
              type: 'user.input',
            },
          ],
          priority: ['crm', 'organization.directory', 'user.input'],
        },
        transform: mappingTransformsForField(field),
        confidence: {
          score: 0.0,
          status: 'unverified',
        },
        status: 'suggested',
        lifecycle: {
          states: ['discovered', 'suggested', 'reviewed', 'validated', 'active'],
          current: 'suggested',
        },
        suggestion: {
          source: `crm.${sourcePath}`,
          confidence: 0.92,
        },
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
    if (!f.name) continue;
    if (f.type === 'date') {
      transforms[f.name] = { type: 'date', format: 'MM/DD/YYYY' };
    } else if (f.type === 'currency') {
      transforms[f.name] = { type: 'currency' };
    }
  }
  return transforms;
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
    id: capability,
    name: options.name?.trim() || capabilityToDisplayName(capability),
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
  };
}

/** Generate required-field validation schema scaffold. */
export function generateValidation(fields: Field[]): ValidationSchema {
  const agentField =
    fields.find((field) => field.name.toLowerCase() === 'agentsname')?.name ??
    'agentsname';

  return {
    rules: [
      {
        field: agentField,
        required: true,
      },
    ],
  };
}

function toWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

function toLabel(fieldName: string): string {
  const words = toWords(fieldName);
  if (words.length === 0) return 'Field';
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function inferQuestionClass(fieldName: string): QuestionClass {
  const key = fieldName.toLowerCase();
  if (/(address|street|city|state|zip|postal|county)/.test(key)) return 'address';
  if (/(email|phone|fax|contact)/.test(key)) return 'contact';
  if (/(premium|amount|revenue|income|value|cost|deductible|limit)/.test(key)) return 'financial';
  if (/(risk|loss|hazard|claim|incident|exposure)/.test(key)) return 'risk';
  if (/(license|compliance|regulatory|policy)/.test(key)) return 'compliance';
  if (/(authorize|authorization|signature|signed|consent)/.test(key)) return 'authorization';
  if (/(preference|option|optin|optout)/.test(key)) return 'preference';
  if (/(confirm|confirmation|attest|verify)/.test(key)) return 'confirmation';
  if (/(exception|waiver|override)/.test(key)) return 'exception';
  return 'identity';
}

function toCanonicalKey(fieldName: string): string {
  const normalized = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'agentsname' || normalized === 'agentname') {
    return 'party.agent.name';
  }

  const words = toWords(fieldName);
  if (words.length === 0) return 'party.field.value';
  if (words[0] === 'party') return words.join('.');
  if (words[0] === 'agent') return ['party', ...words].join('.');
  return ['party', ...words].join('.');
}

function toSourcePathFromSemanticKey(semanticKey: string): string {
  const parts = semanticKey.split('.');
  if (parts.length <= 1) return semanticKey;
  return parts.slice(1).join('.');
}

function mappingTransformsForField(field: Field): Array<{ type: string; format?: string }> {
  if (field.type === 'date') {
    return [{ type: 'date', format: 'MM/DD/YYYY' }];
  }
  if (field.type === 'currency') {
    return [{ type: 'currency' }];
  }
  return [];
}

function toMappingId(fieldName: string): string {
  const slug = fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `mapping-${slug || 'field'}`;
}

function toTarget(fieldName: string, capability?: string): string {
  return `${capabilityToTargetPrefix(capability)}.${fieldName.toLowerCase()}`;
}

function toQuestionId(fieldName: string): string {
  const slug = fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `q-${slug || 'field'}`;
}

function inferInputType(field: Field): string {
  if (field.type === 'checkbox') return 'boolean';
  if (field.type === 'date') return 'date';
  if (field.type === 'currency') return 'currency';
  if (field.type === 'table') return 'table';
  return 'text';
}

function inferFormat(field: Field): string | null {
  if (field.type === 'date') return 'MM/DD/YYYY';
  if (field.type === 'currency') return 'USD';
  return null;
}

function defaultRules(field: Field): string[] {
  if (field.type === 'date') return ['non_empty', 'date_format:MM/DD/YYYY'];
  if (field.type === 'currency') return ['non_empty', 'currency'];
  if (field.type === 'checkbox') return ['boolean'];
  return ['non_empty', `max_length:${Math.max(1, Math.round(field.maxWidth ?? 175))}`];
}

function buildFallbackQuestions(
  fields: Field[],
  capability?: string
): QuestionExportSchema {
  const resolvedCapability = normalizeCapability(capability);
  const questions = fields
    .filter((field) => field.name.trim() !== '')
    .map((field): QuestionSchema => {
      const label = toLabel(field.name);
      const canonicalKey = toCanonicalKey(field.name);
      const target = toTarget(field.name, resolvedCapability);

      return {
        id: toQuestionId(field.name),
        canonicalKey,
        label,
        section: 'Applicant Information',
        required: true,
        sources: ['crm.customer', 'organization.directory', 'previous_submission'],
        targetField: target,
        completionBehavior: {
          allowInference: true,
          allowLookup: true,
          writesTo: [target],
        },
        questionClass: inferQuestionClass(field.name),
        field: {
          canonicalKey,
          target,
        },
        prompt: {
          label,
          question: `What is the ${label.toLowerCase()}?`,
          helpText: `Enter the value for ${label}.`,
        },
        type: {
          input: inferInputType(field),
          format: inferFormat(field),
        },
        context: {
          section: 'Applicant Information',
          page: field.page + 1,
          purpose: `Completes ${label} for ${resolvedCapability}.`,
        },
        requirements: {
          required: true,
          confidenceRequired: 0.95,
        },
        resolution: {
          allowInference: true,
          allowLookup: true,
          sources: ['crm.customer', 'organization.directory', 'previous_submission'],
        },
        validation: {
          rules: defaultRules(field),
        },
        completion: {
          writesTo: [target],
        },
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
  const label = toLabel(field.name);
  const canonicalKey = toCanonicalKey(field.name);
  const target = toTarget(field.name, capability);
  return {
    id: typeof question?.id === 'string' && question.id ? question.id : toQuestionId(field.name),
    canonicalKey: question?.canonicalKey ?? question?.field?.canonicalKey ?? canonicalKey,
    label: question?.label ?? question?.prompt?.label ?? label,
    section: question?.section ?? question?.context?.section ?? 'Applicant Information',
    required: question?.required ?? question?.requirements?.required ?? true,
    sources: Array.isArray(question?.sources)
      ? question.sources
      : Array.isArray(question?.resolution?.sources)
        ? question.resolution.sources
        : ['crm.customer', 'organization.directory', 'previous_submission'],
    targetField: question?.targetField ?? question?.field?.target ?? target,
    completionBehavior: {
      allowInference:
        question?.completionBehavior?.allowInference ??
        question?.resolution?.allowInference ??
        true,
      allowLookup:
        question?.completionBehavior?.allowLookup ??
        question?.resolution?.allowLookup ??
        true,
      writesTo: Array.isArray(question?.completionBehavior?.writesTo)
        ? question.completionBehavior.writesTo
        : Array.isArray(question?.completion?.writesTo)
          ? question.completion.writesTo
          : [target],
    },
    questionClass: (question?.questionClass ?? inferQuestionClass(field.name)) as QuestionClass,
    field: {
      canonicalKey: question?.field?.canonicalKey ?? canonicalKey,
      target: question?.field?.target ?? target,
    },
    prompt: {
      label: question?.prompt?.label ?? label,
      question: question?.prompt?.question ?? `What is the ${label.toLowerCase()}?`,
      helpText: question?.prompt?.helpText ?? `Enter the value for ${label}.`,
    },
    type: {
      input: question?.type?.input ?? inferInputType(field),
      format: question?.type?.format ?? inferFormat(field),
    },
    context: {
      section: question?.context?.section ?? 'Applicant Information',
      page: question?.context?.page ?? field.page + 1,
      purpose:
        question?.context?.purpose ??
        `Completes ${label} for ${normalizeCapability(capability)}.`,
    },
    requirements: {
      required: question?.requirements?.required ?? true,
      confidenceRequired: question?.requirements?.confidenceRequired ?? 0.95,
    },
    resolution: {
      allowInference: question?.resolution?.allowInference ?? true,
      allowLookup: question?.resolution?.allowLookup ?? true,
      sources: Array.isArray(question?.resolution?.sources)
        ? question.resolution.sources
        : ['crm.customer', 'organization.directory', 'previous_submission'],
    },
    validation: {
      rules: Array.isArray(question?.validation?.rules)
        ? question.validation.rules
        : defaultRules(field),
    },
    completion: {
      writesTo: Array.isArray(question?.completion?.writesTo)
        ? question.completion.writesTo
        : [target],
    },
  };
}

async function generateQuestionsWithOllama(
  fields: Field[],
  model = 'llama3.1:8b',
  capability?: string
): Promise<QuestionExportSchema> {
  const resolvedCapability = normalizeCapability(capability);
  const namedFields = fields.filter((f) => f.name.trim() !== '');
  const fallback = buildFallbackQuestions(namedFields, resolvedCapability);
  const fieldSpec = namedFields
    .map((f) => ({ name: f.name, type: f.type, page: f.page + 1 }));

  const prompt = [
    'Generate JSON only. No markdown. No explanation.',
    'Return a single JSON object with keys: schemaVersion, capability, questions.',
    `schemaVersion must be "1.0" and capability must be "${resolvedCapability}".`,
    'Create exactly one question per provided field and preserve field mapping to each target field.',
    'Each question must include: id, questionClass, field, prompt, type, context, requirements, resolution, validation, completion.',
    'questionClass must be one of: identity,address,contact,financial,risk,compliance,authorization,preference,confirmation,exception.',
    'Field list JSON:',
    JSON.stringify(fieldSpec),
    `Target pattern for field.target and completion.writesTo is ${capabilityToTargetPrefix(resolvedCapability)}.<fieldname-lowercase>.`,
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
