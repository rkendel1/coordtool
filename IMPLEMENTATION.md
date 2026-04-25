# Phase 2 & 3 Enhancements - Implementation Guide

This document describes the major enhancements implemented for the PDF Field Mapper tool.

## Phase 2: Schema-Driven Rendering Engine

### 1. ✅ Schema-Driven PDF Rendering Engine

**Location**: `src/renderer/pdfRenderer.ts`

The new rendering engine provides a single entry point for PDF generation:

```typescript
import { renderPdf } from './renderer/pdfRenderer';

const pdfBytes = await renderPdf({
  pdfTemplate: templateBytes,
  layout: layoutSchema,
  mapping: mappingSchema,
  transforms: transformsSchema,
  data: yourData,
  tables: tablesSchema,
  pageOffsets: { 0: { x: 0, y: -3 } },
  maxLines: { description: 3 },
  overflowStrategy: 'truncate'
});
```

**Key Features**:
- No special cases - everything driven by schema
- Automatic value resolution from data
- Transform application for formatting
- Consistent field rendering

### 2. ✅ Preview Mode

**Location**: `src/components/PreviewPanel.tsx`

A critical feature that closes the loop: **map → preview → adjust → export**

**Usage**:
1. Define fields in the mapper
2. Fill in sample data in the Preview Panel
3. Click "Generate Preview" to see the rendered PDF
4. Make adjustments and re-preview
5. Export when satisfied

**Benefits**:
- No need to run backend code to see results
- Instant feedback on field positioning
- Test transforms and formatters in real-time

### 3. ✅ Multiline + Overflow Handling

**Location**: `src/renderer/pdfRenderer.ts` (functions: `wrapText`, `handleMultilineOverflow`)

**Features**:
- Line wrapping based on `maxWidth`
- `maxLines` property to limit line count
- Overflow strategies:
  - `truncate`: Cut off excess lines with ellipsis (...)
  - `shrink`: Reduce to max lines (future: font scaling)
  - `continue`: Allow overflow

**Example**:
```typescript
const layoutEntry = {
  // ... other properties
  maxLines: 3,
  overflowStrategy: 'truncate'
};
```

### 4. ✅ Table Rendering Engine

**Location**: `src/renderer/pdfRenderer.ts` (function: `drawTable`)

Renders tabular data with proper column alignment:

```typescript
const table = {
  type: 'table',
  page: 0,
  startY: 500,
  rowHeight: 14,
  maxRows: 10,
  columns: {
    street: { x: 100 },
    city: { x: 250 },
    state: { x: 350 }
  }
};

// Data structure
const data = {
  locations: [
    { street: '123 Main St', city: 'New York', state: 'NY' },
    { street: '456 Oak Ave', city: 'Boston', state: 'MA' }
  ]
};
```

**Features**:
- Automatic row iteration
- `maxRows` limiting
- Per-column positioning
- Overflow handling

### 5. ✅ Field-Level Formatters

**Location**: `src/formatters/index.ts`

Transform placeholders are now executable formatters:

**Built-in formatters**:
- `date`: Format dates (e.g., MM/DD/YYYY)
- `currency`: Format as currency ($1,234.56)
- `percentage`: Format as percentage (50%)
- `phone`: Format phone numbers ((123) 456-7890)

**Example**:
```typescript
const transforms = {
  effectiveDate: { type: 'date', format: 'MM/DD/YYYY' },
  premium: { type: 'currency' }
};

// Automatic application during rendering
applyTransforms('effectiveDate', new Date(), transforms);
// => "04/25/2026"
```

### 6. ✅ Checkbox Rendering Engine

**Location**: `src/renderer/pdfRenderer.ts` (function: `drawCheckbox`)

Checkboxes are rendered differently from text fields:

**Styles**:
- `X`: Draw an X mark (default)
- `checkmark`: Draw a ✓ symbol
- `filled`: Draw a filled rectangle

**Example**:
```typescript
const field = {
  type: 'checkbox',
  checkboxStyle: 'X', // or 'checkmark' or 'filled'
  // ... other properties
};
```

### 7. ✅ Page Calibration Layer

**Location**: `src/renderer/pdfRenderer.ts` (interface: `PageOffset`)

Even perfect mapping can drift - apply page-level offsets:

```typescript
const pageOffsets = {
  0: { x: 0, y: -3 },   // Page 1: shift down 3 pixels
  1: { x: 1, y: -5 }    // Page 2: shift right 1, down 5
};

await renderPdf({
  // ... other options
  pageOffsets
});
```

**Benefits**:
- Avoid re-mapping entire forms
- Quick drift corrections
- Per-page adjustments

## Phase 3: System Loop Closure

### 8. ✅ Versioned Schema Storage

**Location**: `schemas/`

Schemas are now treated as versioned assets:

```
schemas/
├── acord-126/
│   └── v1/
│       ├── layout.json
│       ├── mapping.json
│       └── transforms.json
├── acord-125/
│   └── v1/
│       └── ...
└── acord-130/
    └── v1/
        └── ...
```

**Why versioning matters**:
- ACORD forms change over time
- Carriers modify PDFs
- Rollback capability
- Audit trail

**Best Practices**:
- Never modify existing versions
- Create v2, v3, etc. for updates
- Document changes in CHANGELOG.md
- Keep PDF templates synchronized

### 9. ✅ Form Registry

**Location**: `src/registry/FormRegistry.ts`

Central registry for form schemas:

```typescript
import { formRegistry } from './registry/FormRegistry';

// Register a form
await formRegistry.loadFromFiles(
  'acord-126',
  'ACORD 126',
  'v1',
  schemaData
);

// Retrieve a form
const form = formRegistry.getForm('acord-126');

// List all forms
const allForms = formRegistry.listForms();
```

**Orchestration** (`src/registry/formGenerator.ts`):

```typescript
import { generateForms } from './registry/formGenerator';

// Automatically generate all required forms
const results = await generateForms(data, templates);

results.forEach(result => {
  if (result.success) {
    console.log(`Generated ${result.formType}`);
  } else {
    console.error(`Failed: ${result.error}`);
  }
});
```

### 10. ✅ Regression Testing

**Location**: `src/__tests__/`

New test suites ensure reliability:

- **formatters.test.ts**: Tests all field formatters
- **pdfRenderer.test.ts**: Tests rendering engine functions
- **FormRegistry.test.ts**: Tests form registry operations
- **schema.test.ts**: Tests schema generation (existing)

**Running tests**:
```bash
npm test
```

**Test Coverage**:
- Value resolution and mapping
- Transform application
- Text wrapping and overflow
- Form registration and retrieval

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              PDF Field Mapper UI                │
│  (Map fields visually on PDF overlay)           │
└───────────────┬─────────────────────────────────┘
                │ Exports
                ↓
┌─────────────────────────────────────────────────┐
│           Schema Files (Versioned)              │
│  • layout.json                                  │
│  • mapping.json                                 │
│  • transforms.json                              │
└───────────────┬─────────────────────────────────┘
                │ Loads into
                ↓
┌─────────────────────────────────────────────────┐
│            Form Registry                        │
│  Manages schemas and templates                  │
└───────────────┬─────────────────────────────────┘
                │ Used by
                ↓
┌─────────────────────────────────────────────────┐
│         PDF Rendering Engine                    │
│  • resolveValue()                               │
│  • applyTransforms()                            │
│  • drawField()                                  │
│  • renderPdf()                                  │
└───────────────┬─────────────────────────────────┘
                │ Generates
                ↓
┌─────────────────────────────────────────────────┐
│           Filled PDF Forms                      │
│  ACORD 125, 126, 130, etc.                      │
└─────────────────────────────────────────────────┘
```

## Usage Workflow

### 1. Create Schema (One-Time Setup)
```typescript
// Use the visual mapper tool
1. Upload PDF
2. Draw fields
3. Configure field properties
4. Export schema files
5. Save to schemas/form-name/v1/
```

### 2. Register Form
```typescript
import { formRegistry } from './registry/FormRegistry';
import layoutJson from './schemas/acord-126/v1/layout.json';
import mappingJson from './schemas/acord-126/v1/mapping.json';
import transformsJson from './schemas/acord-126/v1/transforms.json';

await formRegistry.loadFromFiles('acord-126', 'ACORD 126', 'v1', {
  layout: layoutJson,
  mapping: mappingJson,
  transforms: transformsJson
});
```

### 3. Generate PDF
```typescript
import { generateForm } from './registry/formGenerator';

const result = await generateForm(
  {
    formType: 'acord-126',
    data: {
      applicant: {
        name: 'John Doe',
        address: '123 Main St'
      },
      policy: {
        effectiveDate: new Date('2024-03-15'),
        number: 'POL-12345',
        premium: 1234.56
      }
    }
  },
  templateBytes
);

if (result.success) {
  // Save or download result.pdf
}
```

### 4. Preview (During Development)
```typescript
// Use the PreviewPanel component in the UI
1. Fill in sample data
2. Click "Generate Preview"
3. View rendered PDF in-app
4. Adjust fields if needed
5. Re-preview until perfect
```

## New Type Definitions

### LayoutEntry (Enhanced)
```typescript
interface LayoutEntry {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  fontSize: number;
  maxWidth: number;
  maxLines?: number;                    // NEW
  overflowStrategy?: 'truncate' | 'shrink' | 'continue'; // NEW
  checkboxStyle?: 'X' | 'checkmark' | 'filled';         // NEW
}
```

### RenderOptions
```typescript
interface RenderOptions {
  pdfTemplate: Uint8Array | ArrayBuffer;
  layout: Record<string, LayoutEntry>;
  mapping: Record<string, MappingEntry>;
  transforms: Record<string, TransformEntry>;
  data: Record<string, any>;
  tables?: Record<string, TableDefinition>;
  pageOffsets?: Record<number, PageOffset>;  // NEW
  maxLines?: Record<string, number>;         // NEW
  overflowStrategy?: 'truncate' | 'shrink' | 'continue'; // NEW
}
```

## Migration Guide

If you have existing schemas, they will continue to work. The new features are opt-in:

1. **Overflow control**: Add `maxLines` and `overflowStrategy` to fields as needed
2. **Page offsets**: Add `pageOffsets` to renderPdf calls if drift occurs
3. **Checkbox styles**: Add `checkboxStyle` to checkbox fields for custom rendering
4. **Preview mode**: Integrate PreviewPanel component into your UI

## Testing Strategy

### Unit Tests
- All core functions have unit tests
- Formatters tested with edge cases
- Registry operations validated

### Integration Tests (Future)
- Generate PDFs with fixture data
- Compare byte sizes or visual diffs
- Detect silent drift

### Regression Tests (Recommended)
```typescript
// Generate reference PDF
const reference = await generateForm(request, template);

// After changes, regenerate
const current = await generateForm(request, template);

// Compare
expect(current.pdf.length).toBe(reference.pdf.length);
// Or use visual diff tool
```

## Performance Considerations

- **Rendering**: PDF rendering is async and may take 1-2 seconds for complex forms
- **Preview**: Generate preview on-demand, not on every data change
- **Registry**: Forms are cached in memory after loading
- **Formatters**: All formatters are pure functions (fast)

## Security Notes

- Never store sensitive data in schema files
- Validate all user input before rendering
- Sanitize file uploads (PDF templates)
- Use environment-specific configurations for production

## Future Enhancements

Potential areas for expansion:

1. **OCR-assisted field detection** (already partially implemented)
2. **Visual regression testing** with screenshot comparison
3. **Shared schema registry** (cloud-based)
4. **Font scaling** for shrink overflow strategy
5. **Multi-page table overflow** support
6. **Dynamic form selection** based on business rules

## Support

For issues or questions:
1. Check test files for usage examples
2. Review schema README in `schemas/README.md`
3. Consult inline code documentation
4. Run tests: `npm test`
5. Build app: `npm run build`

---

**Status**: ✅ All Phase 2 & 3 items implemented and tested
**Test Coverage**: 54 passing tests
**Build Status**: ✅ Successful
