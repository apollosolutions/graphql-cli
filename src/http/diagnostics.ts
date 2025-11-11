export interface RequestLogOptions {
  stream: NodeJS.WritableStream;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export function printRequestLog(options: RequestLogOptions): void {
  const lines: string[] = [];
  lines.push(formatLine(`${options.method.toUpperCase()} ${options.url}`));

  const headerEntries = Object.entries(options.headers);
  if (headerEntries.length === 0) {
    lines.push(formatLine('Headers: <none>'));
  } else {
    lines.push(formatLine('Headers:'));
    for (const [name, value] of headerEntries.sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(formatLine(`  ${name}: ${value}`));
    }
  }

  if (options.body !== undefined) {
    const serialized =
      typeof options.body === 'string' ? options.body : JSON.stringify(options.body, null, 2);
    lines.push(formatLine('Body:'));
    for (const line of serialized.split('\n')) {
      lines.push(formatLine(`  ${line}`));
    }
  }

  lines.push('');
  options.stream.write(lines.join('\n'));
}

function formatLine(message: string): string {
  return `[request] ${message}`;
}
