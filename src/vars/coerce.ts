import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isScalarType,
} from 'graphql';

import { InvalidArgsError } from '../errors/exit.js';

export interface VariableDefinition {
  name: string;
  type: GraphQLInputType;
  defaultValue?: unknown;
}

export type FlagValue = string | boolean | number | string[] | boolean[] | number[] | Record<string, unknown> | undefined;

export interface CoerceOptions {
  splitLists?: boolean;
}

export function coerceVariables(
  defs: VariableDefinition[],
  flags: Record<string, FlagValue>,
  options: CoerceOptions = {}
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  for (const def of defs) {
    const raw = pickFlagValue(flags, def.name);

    if (raw === undefined) {
      if (!isOptional(def)) {
        throw new InvalidArgsError(`Missing required variable "${def.name}".`);
      }
      if (def.defaultValue !== undefined) {
        variables[def.name] = def.defaultValue;
      }
      continue;
    }

    variables[def.name] = coerceInputValue(def.type, raw, def.name, options);
  }

  return variables;
}

function coerceInputValue(
  type: GraphQLInputType,
  raw: FlagValue,
  label: string,
  options: CoerceOptions
): unknown {
  if (isNonNullType(type)) {
    return coerceInputValue(type.ofType, raw, label, options);
  }

  if (raw === null) {
    return null;
  }

  if (isListType(type)) {
    const arr = toArray(raw, options.splitLists !== false);
    return arr.map((value, index) => coerceInputValue(type.ofType, value, `${label}[${index}]`, options));
  }

  if (isInputObjectType(type)) {
    const objectValue = buildInputObject(raw, label);
    const result: Record<string, unknown> = {};
    for (const field of Object.values(type.getFields())) {
      const fieldRaw = objectValue[field.name];
      if (fieldRaw === undefined) {
        if (isNonNullType(field.type)) {
          throw new InvalidArgsError(`Missing required field "${label}.${field.name}".`);
        }
        if (field.defaultValue !== undefined) {
          result[field.name] = field.defaultValue;
        }
        continue;
      }
      result[field.name] = coerceInputValue(field.type, fieldRaw, `${label}.${field.name}`, options);
    }
    return result;
  }

  if (isEnumType(type)) {
    return coerceEnumValue(type, raw, label);
  }

  if (isScalarType(type)) {
    return coerceScalarValue(type, raw, label);
  }

  throw new InvalidArgsError(`Unsupported input type for variable "${label}".`);
}

function coerceScalarValue(type: GraphQLScalarType, raw: FlagValue, label: string): unknown {
  const stringValue = normalizePrimitive(raw);
  if (stringValue === undefined) {
    return raw;
  }

  switch (type.name) {
    case 'Int':
      if (!/^[-+]?\d+$/.test(stringValue)) {
        throw new InvalidArgsError(`Variable "${label}" expected an integer.`);
      }
      return Number.parseInt(stringValue, 10);
    case 'Float':
      if (!/^[-+]?\d*(\.\d+)?$/.test(stringValue)) {
        throw new InvalidArgsError(`Variable "${label}" expected a float.`);
      }
      return Number.parseFloat(stringValue);
    case 'Boolean':
      if (/^(true|1)$/i.test(stringValue)) {
        return true;
      }
      if (/^(false|0)$/i.test(stringValue)) {
        return false;
      }
      throw new InvalidArgsError(`Variable "${label}" expected a boolean.`);
    case 'ID':
    case 'String':
      return stringValue;
    default:
      return stringValue;
  }
}

function coerceEnumValue(type: GraphQLEnumType, raw: FlagValue, label: string): string {
  const stringValue = normalizePrimitive(raw);
  if (!stringValue) {
    throw new InvalidArgsError(`Variable "${label}" expected enum ${type.name}.`);
  }
  const value = type.getValue(stringValue);
  if (!value) {
    const allowed = type.getValues().map((v) => v.name).join(', ');
    throw new InvalidArgsError(`Variable "${label}" expected one of [${allowed}].`);
  }
  return value.value as string;
}

function pickFlagValue(flags: Record<string, FlagValue>, variable: string): FlagValue {
  if (flags[variable] !== undefined) {
    return flags[variable];
  }

  const prefix = `${variable}.`;
  const nestedEntries = Object.entries(flags)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => [key.slice(prefix.length), value] as const);

  if (nestedEntries.length === 0) {
    return undefined;
  }

  const root: Record<string, unknown> = {};
  for (const [path, value] of nestedEntries) {
    setByPath(root, path.split('.'), value);
  }

  return root;
}

function setByPath(target: Record<string, unknown>, parts: string[], value: FlagValue): void {
  const [head, ...rest] = parts;
  if (!head) {
    return;
  }
  if (rest.length === 0) {
    target[head] = value;
    return;
  }
  if (!target[head] || typeof target[head] !== 'object') {
    target[head] = {};
  }
  setByPath(target[head] as Record<string, unknown>, rest, value);
}

function buildInputObject(raw: FlagValue, label: string): Record<string, FlagValue> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, FlagValue>;
  }
  throw new InvalidArgsError(`Variable "${label}" expects an object.`);
}

function toArray(value: FlagValue, splitLists: boolean): FlagValue[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && splitLists && value.includes(',')) {
    return value.split(',').map((part) => part.trim()).filter(Boolean);
  }
  return [value];
}

function normalizePrimitive(value: FlagValue): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function isOptional(def: VariableDefinition): boolean {
  return !isNonNullType(def.type) && def.defaultValue === undefined;
}
