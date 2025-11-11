import {
  GraphQLArgument,
  GraphQLField,
  GraphQLInputType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLType,
  isListType,
  isNonNullType,
  isObjectType,
} from 'graphql';

import { InvalidArgsError, NetworkError } from '../errors/exit.js';
import { buildDefaultSelection, buildDocumentFromFields } from '../fields/builder.js';
import { parseFields } from '../fields/parser.js';
import { httpRequest } from '../http/client.js';
import { printRequestLog } from '../http/diagnostics.js';
import { loadSchemaFromUrl } from '../introspection/index.js';
import { GraphQLResponseLike } from '../output/json.js';
import { coerceVariables, FlagValue, VariableDefinition } from '../vars/coerce.js';

export interface UrlModeOptions {
  fields?: string;
  headers?: Record<string, string>;
  redactedHeaders?: Record<string, string>;
  document?: string;
  operationName?: string;
  cache?: {
    ttlMs?: number;
    dir?: string;
  };
  diagnostics?: UrlModeDiagnosticsOptions;
}

export interface UrlModeDiagnosticsOptions {
  printRequest?: boolean;
  stderr?: NodeJS.WritableStream;
}

export interface UrlModeParams {
  endpoint: string;
  kind: 'query' | 'mutation';
  operationName: string;
  variables: Record<string, unknown>;
  options?: UrlModeOptions;
  schema?: GraphQLSchema;
}

export interface UrlModeResult {
  document: string;
  variables: Record<string, unknown>;
  result: GraphQLResponseLike;
}

export async function runUrlMode(params: UrlModeParams): Promise<UrlModeResult> {
  const { endpoint, kind, operationName, variables, options = {}, schema: providedSchema } = params;

  const schema =
    providedSchema ??
    (await loadSchemaFromUrl(endpoint, {
      headers: options.headers,
      cache: options.cache,
    }));
  const root = getRootType(schema, kind);
  const field = root.getFields()[operationName];
  if (!field) {
    throw new InvalidArgsError(`Operation "${operationName}" not found on ${root.name}.`);
  }

  const variableDefs = buildVariableDefinitions(field.args);
  const coercedVariables = coerceVariables(variableDefs, variables as Record<string, FlagValue>);
  const document = options.document ?? buildOperationDocument(schema, kind, field, options.fields);

  const requestBody: Record<string, unknown> = {
    query: document,
    variables: coercedVariables,
  };

  if (options.operationName) {
    requestBody.operationName = options.operationName;
  }

  if (options.diagnostics?.printRequest && options.diagnostics.stderr) {
    printRequestLog({
      stream: options.diagnostics.stderr,
      method: 'POST',
      url: endpoint,
      headers: options.redactedHeaders ?? options.headers ?? {},
      body: requestBody,
    });
  }

  const response = await httpRequest<GraphQLResponseLike>({
    url: endpoint,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new NetworkError(`GraphQL request failed (${response.status}).`);
  }

  return {
    document,
    variables: coercedVariables,
    result: payload,
  };
}

function getRootType(schema: GraphQLSchema, kind: 'query' | 'mutation'): GraphQLObjectType {
  if (kind === 'query') {
    const type = schema.getQueryType();
    if (!type) {
      throw new InvalidArgsError('Schema does not define a query root.');
    }
    return type;
  }
  if (kind === 'mutation') {
    const type = schema.getMutationType();
    if (!type) {
      throw new InvalidArgsError('Schema does not define a mutation root.');
    }
    return type;
  }
  throw new InvalidArgsError(`Unsupported operation kind "${kind}".`);
}

function buildVariableDefinitions(args: readonly GraphQLArgument[]): VariableDefinition[] {
  return args.map((arg) => ({
    name: arg.name,
    type: arg.type as GraphQLInputType,
    defaultValue: arg.defaultValue,
  }));
}

function buildOperationDocument(
  schema: GraphQLSchema,
  kind: 'query' | 'mutation',
  field: GraphQLField<unknown, unknown>,
  fieldSelection?: string
): string {
  const variableDefs = field.args.length
    ? `(${field.args.map((arg) => `$${arg.name}: ${renderType(arg.type)}`).join(', ')})`
    : '';
  const argInvocations = field.args.length
    ? `(${field.args.map((arg) => `${arg.name}: $${arg.name}`).join(', ')})`
    : '';

  const selection = buildReturnSelection(schema, field, fieldSelection);
  const selectionBlock = selection ? ` {
${indent(selection.trim(), 4)}
  }` : '';

  return `${kind} ${variableDefs} {
  ${field.name}${argInvocations}${selectionBlock}
}`;
}

function buildReturnSelection(
  schema: GraphQLSchema,
  field: GraphQLField<unknown, unknown>,
  fieldsArg?: string
): string {
  const returnType = unwrapType(field.type);
  if (!isObjectType(returnType)) {
    return '';
  }

  const target = returnType as GraphQLObjectType;
  if (fieldsArg) {
    const parsed = parseFields(fieldsArg);
    const doc = buildDocumentFromFields(schema, target, parsed);
    return stripOuter(doc);
  }

  const doc = buildDefaultSelection(schema, target);
  return stripOuter(doc);
}

function stripOuter(doc: string): string {
  const trimmed = doc.trim();
  if (!trimmed.startsWith('{')) {
    return trimmed;
  }
  const lines = trimmed.split('\n');
  return lines.slice(1, lines.length - 1).join('\n');
}

function renderType(type: GraphQLType): string {
  if (isNonNullType(type)) {
    return `${renderType(type.ofType)}!`;
  }
  if (isListType(type)) {
    return `[${renderType(type.ofType)}]`;
  }
  if ('name' in type) {
    return type.name ?? 'Unknown';
  }
  return 'Unknown';
}

function unwrapType(type: GraphQLType): GraphQLType {
  if (isNonNullType(type) || isListType(type)) {
    return unwrapType(type.ofType);
  }
  return type;
}

function indent(value: string, spaces: number): string {
  return value
    .split('\n')
    .map((line) => ' '.repeat(spaces) + line)
    .join('\n');
}
