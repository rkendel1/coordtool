export type FieldType =
  | 'text'
  | 'multiline'
  | 'checkbox'
  | 'date'
  | 'currency'
  | 'table';

export interface Field {
  id: string;
  name: string;
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

export interface LegacyMappingEntry {
  target: string;
  transform: string[];
}

export type MappingLifecycleStatus =
  | 'discovered'
  | 'suggested'
  | 'reviewed'
  | 'validated'
  | 'active';

export interface MappingResolutionSource {
  type: 'crm' | 'organization.directory' | 'user.input';
  path?: string;
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
  resolution: {
    sources: MappingResolutionSource[];
    priority: Array<'crm' | 'organization.directory' | 'user.input'>;
  };
  transform: MappingTransform[];
  confidence: {
    score: number;
    status: 'unverified' | 'low' | 'medium' | 'high';
  };
  status: MappingLifecycleStatus;
  lifecycle?: {
    states: MappingLifecycleStatus[];
    current: MappingLifecycleStatus;
  };
  suggestion?: {
    source: string;
    confidence: number;
  };
}

export interface MappingArtifact {
  schemaVersion: '1.0';
  artifactType: 'field-mapping';
  capability: string;
  mappings: MappingDefinition[];
}

export type MappingSchema = MappingArtifact | Record<string, LegacyMappingEntry>;

export interface TransformEntry {
  type: string;
  format?: string;
}
