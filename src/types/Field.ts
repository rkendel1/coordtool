export type FieldType =
  | 'text'
  | 'multiline'
  | 'checkbox'
  | 'date'
  | 'dob'
  | 'currency'
  | 'phone'
  | 'ssn'
  | 'ein'
  | 'zip'
  | 'signature'
  | 'initials'
  | 'table';

export type DateFormat =
  | 'MM/DD/YYYY'
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD'
  | 'MM/DD/YY'
  | 'DD/MM/YY'
  | 'YYYY/MM/DD'
  | 'MMMM DD, YYYY'
  | 'MMM DD, YYYY'
  | 'DD MMMM YYYY'
  | 'DD MMM YYYY';

export type CurrencySymbolCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'CHF'
  | 'CNY';

export type HeightFormat = 'inches' | 'feet-inches' | 'feet' | 'cm';
export type HeightStorageUnit = 'inches' | 'cm';
export type WeightFormat = 'lbs' | 'kg';
export type WeightStorageUnit = 'lbs' | 'kg';
export type StateFormat = 'abbreviation' | 'full_name' | 'lowercase';
export type PhoneFormat = '(xxx) xxx-xxxx' | 'xxx-xxx-xxxx' | 'xxxxxxxxxx';
export type PresentationSpacingStrategy = 'semantic' | 'template' | 'compact';
export type PresentationOverflowStrategy = 'reflow' | 'shrink' | 'clip' | 'expand-region';
export type BoxInputMode = 'digits' | 'alphanumeric' | 'raw';

export interface Field {
  id: string;
  name: string;
  sourceFieldId: string;
  semanticKey: string;
  displayLabel: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  fontSize?: number;
  maxWidth?: number;
  multiline?: boolean;
  tableGroup?: string;
  maxLines?: number; // Phase 2, Item 3: Multiline overflow control
  overflowStrategy?: 'truncate' | 'shrink' | 'continue'; // Phase 2, Item 3
  checkboxStyle?: 'X' | 'checkmark' | 'filled'; // Phase 2, Item 6
  required?: boolean;
  transformType?: 'none' | 'date' | 'currency' | 'percentage' | 'phone' | 'height' | 'weight' | 'state';
  transformFormat?: string;
  dateFormat?: DateFormat;
  currencySymbol?: CurrencySymbolCode;
  heightFormat?: HeightFormat;
  heightStorageUnit?: HeightStorageUnit;
  weightFormat?: WeightFormat;
  weightStorageUnit?: WeightStorageUnit;
  stateFormat?: StateFormat;
  phoneFormat?: PhoneFormat;
  presentationSpacingStrategy?: PresentationSpacingStrategy;
  presentationOverflowStrategy?: PresentationOverflowStrategy;
  boxedTextEnabled?: boolean;
  boxInputMode?: BoxInputMode;
  boxPattern?: string;
}

export interface TableColumn {
  x: number;
}

export interface TableDefinition {
  type: 'table';
  page: number;
  startY: number;
  rowHeight: number;
  maxRows: number;
  columns: Record<string, TableColumn>;
}

export interface LayoutEntry {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  fontSize: number;
  maxWidth: number;
  maxLines?: number; // Phase 2, Item 3: Multiline overflow control
  overflowStrategy?: 'truncate' | 'shrink' | 'continue'; // Phase 2, Item 3
  checkboxStyle?: 'X' | 'checkmark' | 'filled'; // Phase 2, Item 6
}

export interface MappingTransform {
  type: string;
  format?: string;
}

export interface MappingDefinition {
  id: string;
  semantic: {
    key: string;
    label: string;
    type: string;
  };
  target: {
    field: string;
    layoutReference: string;
  };
  transform: MappingTransform[];
}

export interface MappingArtifact {
  schemaVersion: '1.0';
  artifactType: 'field-mapping';
  capability: string;
  mappings: MappingDefinition[];
}

export interface TransformEntry {
  type: string;
  format?: string;
}
