import {
  Field,
  LayoutEntry,
  MappingEntry,
  TransformEntry,
  TableDefinition,
} from '../types/Field';

/** Generate the unified layout schema (single source of truth). */
export function generateLayout(fields: Field[]): Record<string, LayoutEntry> {
  const layout: Record<string, LayoutEntry> = {};
  for (const f of fields) {
    if (!f.name) continue;
    layout[f.name] = {
      page: f.page,
      x: Math.round(f.x),
      y: Math.round(f.y),
      width: Math.round(f.width),
      height: Math.round(f.height),
      type: f.type,
      fontSize: f.fontSize ?? 10,
      maxWidth: f.maxWidth ?? Math.round(f.width),
    };
  }
  return layout;
}

/** Generate a canonical mapping scaffold. */
export function generateMapping(
  fields: Field[]
): Record<string, MappingEntry> {
  const mapping: Record<string, MappingEntry> = {};
  for (const f of fields) {
    if (!f.name) continue;
    mapping[`TODO.${f.name}`] = {
      target: f.name,
      transform: [],
    };
  }
  return mapping;
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
