# Versioned Schema Storage

This directory contains versioned schemas for PDF forms.

## Structure

```
schemas/
├── acord-126/
│   └── v1/
│       ├── layout.json
│       ├── mapping.json
│       └── transforms.json
├── acord-125/
│   └── v1/
│       ├── layout.json
│       ├── mapping.json
│       └── transforms.json
└── acord-130/
    └── v1/
        ├── layout.json
        ├── mapping.json
        └── transforms.json
```

## Why Versioned Storage?

1. **ACORD forms change**: Insurance forms get updated periodically
2. **Carriers modify PDFs**: Different carriers may have slightly different versions
3. **Rollback capability**: You can revert to a previous schema if needed
4. **Audit trail**: Track changes over time

## Schema Files

### layout.json
Contains field coordinates, sizes, types, and rendering properties.

```json
{
  "applicantName": {
    "page": 0,
    "x": 118,
    "y": 712,
    "width": 260,
    "height": 14,
    "type": "text",
    "fontSize": 10,
    "maxWidth": 260
  }
}
```

### mapping.json
Maps data paths to form fields.

```json
{
  "applicant.name": {
    "target": "applicantName",
    "transform": []
  }
}
```

### transforms.json
Defines field-level formatters.

```json
{
  "effectiveDate": {
    "type": "date",
    "format": "MM/DD/YYYY"
  },
  "premium": {
    "type": "currency"
  }
}
```

## Usage

Load schemas into the form registry:

```typescript
import { formRegistry } from './registry/FormRegistry';

// Load ACORD 126 v1
const schema = {
  layout: require('./schemas/acord-126/v1/layout.json'),
  mapping: require('./schemas/acord-126/v1/mapping.json'),
  transforms: require('./schemas/acord-126/v1/transforms.json'),
};

await formRegistry.loadFromFiles('acord-126', 'ACORD 126', 'v1', schema);
```

## Best Practices

1. **Never modify existing versions**: Create a new version (v2) instead
2. **Document changes**: Add a CHANGELOG.md in each version directory
3. **Test before deploying**: Use regression tests to validate new versions
4. **Keep templates synchronized**: Store PDF templates alongside schemas
