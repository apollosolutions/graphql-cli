export interface HeaderDirective {
  name: string;
  value?: string;
  action: 'set' | 'remove';
}

export interface HeaderLayer {
  headers?: Record<string, string | undefined>;
  directives?: HeaderDirective[];
}

export interface BuiltHeaders {
  headers: Record<string, string>;
  redacted: Record<string, string>;
}

export class HeaderParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HeaderParseError';
  }
}

export const REDACTED_TEXT = '***REDACTED***';
const SENSITIVE_PATTERNS = [
  /authorization/i,
  /proxy-authorization/i,
  /authentication/i,
  /api[-_]?key/i,
  /token/i,
  /secret/i,
  /^cookie$/i,
];

export function parseHeaderDirective(raw: string): HeaderDirective {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new HeaderParseError('Header entries must be non-empty strings.');
  }

  const delimiterIndex = findDelimiter(raw);
  if (delimiterIndex === -1) {
    throw new HeaderParseError(`Invalid header "${raw}". Use "Key: Value" or "Key=Value" syntax.`);
  }

  const name = raw.slice(0, delimiterIndex).trim();
  const value = raw.slice(delimiterIndex + 1).trim();
  if (!name) {
    throw new HeaderParseError(`Invalid header "${raw}". Header name is required.`);
  }

  if (!value) {
    return { name, action: 'remove' };
  }

  return { name, action: 'set', value };
}

export function buildHeaders(layers: HeaderLayer[]): BuiltHeaders {
  const store = new Map<string, { display: string; value: string }>();

  for (const layer of layers) {
    if (layer.headers) {
      for (const [name, value] of Object.entries(layer.headers)) {
        if (typeof value !== 'string') {
          continue;
        }
        setHeader(store, name, value);
      }
    }
    if (layer.directives) {
      for (const directive of layer.directives) {
        if (!directive.name) {
          continue;
        }
        if (directive.action === 'remove') {
          store.delete(canonicalName(directive.name));
          continue;
        }
        if (directive.value !== undefined) {
          setHeader(store, directive.name, directive.value);
        }
      }
    }
  }

  const headers: Record<string, string> = {};
  for (const { display, value } of store.values()) {
    headers[display] = value;
  }

  return { headers, redacted: redactHeaders(headers) };
}

export function shouldRedact(name: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(name));
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    output[name] = shouldRedact(name) ? REDACTED_TEXT : value;
  }
  return output;
}

function findDelimiter(value: string): number {
  const colon = value.indexOf(':');
  const equals = value.indexOf('=');
  if (colon === -1 && equals === -1) {
    return -1;
  }
  if (colon === -1) {
    return equals;
  }
  if (equals === -1) {
    return colon;
  }
  return Math.min(colon, equals);
}

function setHeader(
  store: Map<string, { display: string; value: string }>,
  name: string,
  value: string
): void {
  const canonical = canonicalName(name);
  const trimmed = name.trim();
  const display = trimmed.length > 0 ? trimmed : formatHeaderName(canonical);
  store.set(canonical, { display, value });
}

function canonicalName(name: string): string {
  return name.trim().toLowerCase();
}

function formatHeaderName(name: string): string {
  return name
    .split('-')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('-');
}
