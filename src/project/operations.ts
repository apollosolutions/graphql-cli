import {
  GraphQLArgument,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema,
  isNonNullType,
} from 'graphql';

import { EndpointConfig } from '../config/index.js';
import { OperationKind } from '../commands/flag-helpers.js';

export type RootKind = OperationKind;

export interface OperationInfo {
  kind: RootKind;
  field: GraphQLField<unknown, unknown>;
}

export interface OperationIndex {
  byName: Map<string, OperationInfo[]>;
  byKind: Record<RootKind, OperationInfo[]>;
}

export const ROOT_ORDER: RootKind[] = ['query', 'mutation', 'subscription'];

export function buildOperationIndex(schema: GraphQLSchema): OperationIndex {
  const byName = new Map<string, OperationInfo[]>();
  const byKind: Record<RootKind, OperationInfo[]> = {
    query: [],
    mutation: [],
    subscription: [],
  };

  const roots: Array<{ kind: RootKind; type: GraphQLObjectType | null | undefined }> = [
    { kind: 'query', type: schema.getQueryType() },
    { kind: 'mutation', type: schema.getMutationType() },
    { kind: 'subscription', type: schema.getSubscriptionType() },
  ];

  for (const root of roots) {
    if (!root.type) continue;
    const fields = root.type.getFields();
    for (const field of Object.values(fields)) {
      const info: OperationInfo = { kind: root.kind, field };
      if (!byName.has(field.name)) {
        byName.set(field.name, []);
      }
      byName.get(field.name)!.push(info);
      byKind[root.kind].push(info);
    }
  }

  return { byName, byKind };
}

export function orderedGroups(config: EndpointConfig): RootKind[] {
  const custom = config.help?.groupOrder;
  if (!custom || custom.length === 0) {
    return ROOT_ORDER;
  }
  const normalized = custom
    .map((entry) => entry.toLowerCase())
    .filter((entry): entry is RootKind => entry === 'query' || entry === 'mutation' || entry === 'subscription');
  return [...new Set([...normalized, ...ROOT_ORDER])];
}

export function isHidden(op: OperationInfo, config: EndpointConfig): boolean {
  const hideList = config.help?.hide ?? [];
  return hideList.some((entry) => matchesPattern(entry, op));
}

export function getDisplayName(op: OperationInfo, config: EndpointConfig): string {
  const rename = lookupConfiguredValue(config.help?.rename, op);
  return rename ?? op.field.name;
}

export function resolveOperationDescription(
  op: OperationInfo,
  config?: EndpointConfig
): { text?: string; source: 'config' | 'schema' | 'none' } {
  if (config) {
    const describe = lookupConfiguredValue(config.help?.describe, op);
    if (describe) {
      return { text: describe, source: 'config' };
    }
  }
  if (op.field.description) {
    return { text: op.field.description, source: 'schema' };
  }
  return { text: undefined, source: 'none' };
}

export function getDescription(op: OperationInfo, config: EndpointConfig): string | undefined {
  return resolveOperationDescription(op, config).text;
}

export function extractFieldKey(key: string): string {
  if (key.includes('.')) {
    const parts = key.split('.');
    return parts[parts.length - 1];
  }
  return key;
}

export function buildAliasMap(config: EndpointConfig): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const aliases = config.aliases ?? {};
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (!map.has(canonical)) {
      map.set(canonical, []);
    }
    map.get(canonical)!.push(alias);
  }
  return map;
}

export function isArgumentRequired(arg: GraphQLArgument): boolean {
  return isNonNullType(arg.type);
}

function matchesPattern(pattern: string, op: OperationInfo): boolean {
  const normalized = pattern.toLowerCase();
  if (pattern.includes('.')) {
    return normalized === scopedKey(op);
  }
  return normalized === op.field.name.toLowerCase();
}

function scopedKey(op: OperationInfo): string {
  return `${op.kind}.${op.field.name}`.toLowerCase();
}

function lookupConfiguredValue(
  record: Record<string, string> | undefined,
  op: OperationInfo
): string | undefined {
  if (!record) {
    return undefined;
  }
  const scoped = scopedKey(op);
  for (const [key, value] of Object.entries(record)) {
    if (key.includes('.') && key.toLowerCase() === scoped) {
      return value;
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (!key.includes('.') && key.toLowerCase() === op.field.name.toLowerCase()) {
      return value;
    }
  }
  return undefined;
}
