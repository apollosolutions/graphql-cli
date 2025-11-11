import { GraphQLSchema } from 'graphql';

import { EndpointConfig } from '../config/index.js';
import {
  buildAliasMap,
  buildOperationIndex,
  getDisplayName,
  isArgumentRequired,
  isHidden,
  resolveOperationDescription,
  ROOT_ORDER,
  RootKind,
} from '../project/operations.js';

const GROUP_LABEL: Record<RootKind, string> = {
  query: 'Queries',
  mutation: 'Mutations',
  subscription: 'Subscriptions',
};
export interface OperationArgRecord {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface OperationRecord {
  canonicalName: string;
  displayName: string;
  kind: RootKind;
  description?: string;
  descriptionSource: 'config' | 'schema' | 'none';
  hidden: boolean;
  aliases: string[];
  args: OperationArgRecord[];
}

export interface OperationListParams {
  schema: GraphQLSchema;
  endpointConfig?: EndpointConfig;
  showHidden?: boolean;
  kindFilter?: RootKind;
  match?: string;
}

export function buildOperationRecords(params: OperationListParams): OperationRecord[] {
  const { schema, endpointConfig, showHidden, kindFilter, match } = params;
  const index = buildOperationIndex(schema);
  const aliasMap = endpointConfig ? buildAliasMap(endpointConfig) : new Map<string, string[]>();
  const normalizedMatch = match ? match.toLowerCase() : undefined;

  const records: OperationRecord[] = [];

  for (const kind of ROOT_ORDER) {
    const operations = index.byKind[kind] ?? [];
    for (const op of operations) {
      const hidden = endpointConfig ? isHidden(op, endpointConfig) : false;
      if (!showHidden && hidden) {
        continue;
      }
      if (kindFilter && op.kind !== kindFilter) {
        continue;
      }

      const displayName = endpointConfig ? getDisplayName(op, endpointConfig) : op.field.name;
      const descriptionInfo = resolveOperationDescription(op, endpointConfig);
      const aliases = aliasMap.get(op.field.name) ?? [];

      if (normalizedMatch) {
        const haystack = [op.field.name, displayName, ...aliases].join(' ').toLowerCase();
        if (!haystack.includes(normalizedMatch)) {
          continue;
        }
      }

      records.push({
        canonicalName: op.field.name,
        displayName,
        kind: op.kind,
        description: descriptionInfo.text,
        descriptionSource: descriptionInfo.source,
        hidden,
        aliases,
        args: op.field.args.map((arg) => ({
          name: arg.name,
          type: String(arg.type),
          required: isArgumentRequired(arg),
          description: arg.description ?? undefined,
        })),
      });
    }
  }

  return records.sort((a, b) => {
    if (a.kind !== b.kind) {
      return ROOT_ORDER.indexOf(a.kind) - ROOT_ORDER.indexOf(b.kind);
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

export function renderOperationRecordsText(options: { records: OperationRecord[]; targetLabel: string }): string {
  const { records, targetLabel } = options;
  if (records.length === 0) {
    return `No operations matched the provided filters for ${targetLabel}.`;
  }

  const lines: string[] = [];
  lines.push(`Operations for ${targetLabel}`);

  for (const kind of ROOT_ORDER) {
    const group = records.filter((record) => record.kind === kind);
    if (group.length === 0) {
      continue;
    }
    lines.push('');
    lines.push(`${GROUP_LABEL[kind]} (${group.length})`);
    const maxName = Math.max(...group.map((record) => record.displayName.length));

    for (const record of group) {
      const desc = record.description ?? '';
      const hidden = record.hidden ? ' (hidden)' : '';
      const descriptionSuffix = desc ? ` — ${desc}` : '';
      lines.push(`  ${record.displayName.padEnd(maxName + 2, ' ')}${descriptionSuffix}${hidden}`.trimEnd());
      lines.push(`    GraphQL: ${capitalize(record.kind)}.${record.canonicalName}`);
      if (record.aliases.length > 0) {
        lines.push(`    Aliases: ${record.aliases.join(', ')}`);
      }
      if (record.args.length === 0) {
        lines.push('    Args: none');
      } else {
        lines.push('    Args:');
        for (const arg of record.args) {
          const required = arg.required ? ' (required)' : '';
          const description = arg.description ? ` — ${arg.description}` : '';
          lines.push(`      ${arg.name}: ${arg.type}${required}${description}`);
        }
      }
    }
  }

  return lines.join('\n');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
