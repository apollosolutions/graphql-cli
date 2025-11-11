import { InvalidArgsError } from '../errors/exit.js';

export function renderTableFromData(data: unknown): string {
  const rows = Array.isArray(data) ? data : [data];

  if (rows.length === 0) {
    return 'No rows';
  }

  const normalized = rows.map((row) => normalizeRow(row));
  const columns = collectColumns(normalized);

  if (columns.length === 0) {
    throw new InvalidArgsError('Unable to render table: no columns inferred from data.');
  }

  const widths = columns.map((column) => Math.max(column.length, ...normalized.map((row) => (row[column] ?? '').length)));
  const header = formatRow(columns, widths, columns);
  const divider = widths.map((w) => '-'.repeat(w)).join('  ');
  const body = normalized.map((row) => formatRow(columns, widths, columns.map((column) => row[column] ?? '')));

  return [header, divider, ...body].join('\n');
}

function normalizeRow(value: unknown): Record<string, string> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record: Record<string, string> = {};
    for (const [key, child] of Object.entries(value)) {
      record[key] = formatValue(child);
    }
    return record;
  }
  return { value: formatValue(value) };
}

function collectColumns(rows: Array<Record<string, string>>): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      set.add(key);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function formatRow(columns: string[], widths: number[], values: string[]): string {
  return values
    .map((value, index) => value.padEnd(widths[index], ' '))
    .join('  ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}
