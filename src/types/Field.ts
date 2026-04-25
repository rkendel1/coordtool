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

export interface MappingEntry {
  target: string;
  transform: string[];
}

export interface TransformEntry {
  type: string;
  format?: string;
}
