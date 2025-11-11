export interface RequestLogOptions {
  stream: NodeJS.WritableStream;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface ResponseLogOptions {
  stream: NodeJS.WritableStream;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body?: unknown;
}

export function printRequestLog(options: RequestLogOptions): void {
  const lines: string[] = [];
  lines.push(formatLine('request', `${options.method.toUpperCase()} ${options.url}`));
  lines.push(
    ...renderHeaders('request', options.headers, 'Headers: <none>', 'Headers:')
  );
  if (options.body !== undefined) {
    lines.push(...renderBody('request', options.body));
  }
  lines.push('');
  options.stream.write(lines.join('\n'));
}

export function printResponseLog(options: ResponseLogOptions): void {
  const statusLabel = options.ok ? `${options.status} OK` : `${options.status}`;
  const lines: string[] = [];
  lines.push(formatLine('response', `HTTP ${statusLabel}`));
  lines.push(
    ...renderHeaders('response', options.headers, 'Headers: <none>', 'Headers:')
  );
  if (options.body !== undefined) {
    lines.push(...renderBody('response', options.body));
  }
  lines.push('');
  options.stream.write(lines.join('\n'));
}

function renderHeaders(
  kind: 'request' | 'response',
  headers: Record<string, string>,
  emptyMessage: string,
  prefix: string
): string[] {
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return [formatLine(kind, emptyMessage)];
  }
  const lines = [formatLine(kind, prefix)];
  for (const [name, value] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(formatLine(kind, `  ${name}: ${value}`));
  }
  return lines;
}

function renderBody(kind: 'request' | 'response', body: unknown): string[] {
  const serialized = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  const lines = [formatLine(kind, 'Body:')];
  for (const line of serialized.split('\n')) {
    lines.push(formatLine(kind, `  ${line}`));
  }
  return lines;
}

function formatLine(kind: 'request' | 'response', message: string): string {
  return `[${kind}] ${message}`;
}
