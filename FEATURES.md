# PDF Field Mapper - Feature Summary

## Core Features (Initial Implementation)

### Visual PDF Mapping
- Upload PDF forms via drag & drop or file picker
- Canvas overlay for drawing field boxes directly on PDF
- Click-to-select existing fields
- Multi-page navigation with field persistence across pages
- Real-time coordinate capture (normalized to PDF space)

### Field Configuration
- 6 field types: text, multiline, checkbox, date, currency, table
- Configurable properties: name, type, fontSize, maxWidth, tableGroup
- Color-coded field types with visual badges
- Field list with type indicators and page numbers

### Export & Schema Generation
- **layout.json** — Coordinates + field types (single source of truth)
- **mapping.json** — Canonical mapping scaffold with TODO placeholders
- **transforms.json** — Auto-generated format rules for date/currency fields
- **schema.json** — Combined export of all three files
- Table grouping for repeating sections (columns + rows)

### Debug Mode
- Live coordinate display on field boxes
- Bounding box visualization
- Overflow risk warnings (red highlighting for narrow fields)

---

## Enhanced Features (Latest Update)

### 1. OCR-Assisted Field Detection ✨
**What:** Tesseract.js integration for text recognition
**How to use:**
- Enable "OCR" checkbox in header
- System scans PDF page and extracts text with bounding boxes
- When you draw a field, nearby labels are detected (within 100px)
- Field name auto-suggested in camelCase (e.g., "Insured Name:" → `insuredName`)

**Visual feedback:** `📝 OCR detected N words (proximity labeling enabled)`

### 2. Snap-to-Grid Alignment ✨
**What:** Clean coordinate output via grid snapping
**How to use:**
- Select grid size in header (2/4/8/16px or Off)
- Hold **Shift** while drawing to snap field edges to grid
- Coordinates rounded to nearest grid increment

**Visual feedback:** `🔲 Snap-to-grid active (4px grid)`

### 3. Auto-Detect PDF Form Fields ✨
**What:** Parse embedded AcroForm annotations
**How to use:**
- Enable "Auto-detect" checkbox in header
- System calls `pdfjs.getAnnotations()` on page load
- Pre-populates field list with:
  - Exact coordinates from PDF metadata
  - Correct field type (text/multiline/checkbox)
  - Inferred camelCase names from field metadata

**Use case:** For forms with embedded form fields, eliminates manual drawing entirely

### 4. Proximity Label Inference ✨
**What:** Smart field naming from nearby text
**How to use:**
- Enable OCR (checkbox in header)
- Draw a field box
- System scans text to the left and above (prioritizes labels ending with ":")
- Automatically suggests field name

**Examples:**
- "Applicant Name:" → `applicantName`
- "Effective Date" → `effectiveDate`
- "Premium $" → `premium`

### 5. Import Existing Schemas ✨
**What:** Load previously exported schemas for iterative editing
**How to use:**
- Click "📥 Import layout.json" button in sidebar
- Select a `layout.json` or `schema.json` file
- All fields re-populate with original coordinates/types/names
- Continue editing without starting over

**Use case:** Update existing ACORD form schemas when revisions occur

### 6. Named Field Templates ✨
**What:** Pre-built field name library for common ACORD forms
**How to use:**
- Select a field in the canvas
- In FieldEditor sidebar, click "📚 Field Templates"
- Search or filter by form type (ACORD 125, 126, 130, All)
- Click a template to apply name + type to selected field

**Included templates:**
- **ACORD 125:** insuredName, effectiveDate, generalLiabilityLimit, etc.
- **ACORD 126:** applicantName, businessDescription, annualRevenue, etc.
- **ACORD 130:** propertyAddress, buildingValue, deductible, etc.

### 7. Overflow Risk Highlighting ✨
**What:** Visual warnings for fields that are too narrow for their type
**How to use:**
- Enable "Debug" checkbox in header
- Fields with `maxWidth` below minimums show:
  - Red border and fill
  - Red field name label
  - `⚠ OVERFLOW RISK` text in debug mode
- FieldEditor sidebar shows warning: "⚠ currency field should be at least 60px wide"

**Minimum widths:**
- text: 50px
- currency: 60px
- date: 70px
- multiline: 100px
- checkbox: 12px
- table: 40px

---

## Technical Implementation

### Dependencies Added
- `tesseract.js` — Browser-based OCR

### New Utilities
- `src/utils/ocr.ts` — Text extraction, label inference, camelCase conversion
- `src/utils/grid.ts` — Snap-to-grid coordinate rounding
- `src/utils/templates.ts` — ACORD field template library
- `src/utils/validation.ts` — Overflow risk detection

### New Components
- `ImportPanel` — Schema file upload + parsing
- `FieldTemplatePicker` — Searchable template library with form filters

### Enhanced Components
- `PDFViewer` — OCR integration, auto-detect annotations, Shift key listener, grid snapping
- `FieldEditor` — Template picker integration, overflow warnings
- `App` — New state: gridSize, enableOCR, enableAutoDetect

---

## Usage Workflow

### Scenario 1: Manual Field Mapping (Original)
1. Upload PDF
2. Draw field boxes on canvas
3. Name each field manually
4. Export schema

### Scenario 2: OCR-Assisted Mapping (Enhanced)
1. Upload PDF
2. Enable "OCR" checkbox
3. Draw field boxes → names auto-suggested from nearby labels
4. Refine names as needed
5. Export schema

### Scenario 3: Auto-Detect + Templates (Fastest)
1. Upload PDF with embedded form fields
2. Enable "Auto-detect" checkbox → fields pre-populated
3. Select field, use "📚 Field Templates" to apply standard ACORD names
4. Export schema

### Scenario 4: Iterative Refinement
1. Import existing `layout.json`
2. Make adjustments (move fields, add new ones)
3. Enable "Debug" to check for overflow risks
4. Re-export updated schema

---

## Keyboard Shortcuts

- **Shift (hold)** — Snap-to-grid while drawing (when grid is enabled)

---

## Export Format Examples

### layout.json
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
```json
{
  "TODO.applicantName": {
    "target": "applicantName",
    "transform": []
  }
}
```

### transforms.json
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
