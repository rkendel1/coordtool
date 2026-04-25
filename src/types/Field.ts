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
}

export interface MappingEntry {
  target: string;
  transform: string[];
}

export interface TransformEntry {
  type: string;
  format?: string;
}
