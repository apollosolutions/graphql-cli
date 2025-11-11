import {
  GraphQLFieldMap,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLType,
  GraphQLNonNull,
  GraphQLList,
  isObjectType,
  isInterfaceType,
  isScalarType,
  isEnumType,
} from 'graphql';

import { InvalidArgsError } from '../errors/exit.js';
import { ParsedField } from './parser.js';

export interface FieldBuilderOptions {
  depthLimit?: number;
  includeTypename?: boolean;
}

const DEFAULT_DEPTH_LIMIT = 3;

export function buildDocumentFromFields(
  schema: GraphQLSchema,
  root: GraphQLObjectType,
  selections: ParsedField[],
  options: FieldBuilderOptions = {}
): string {
  const selectionSet = renderSelectionSet(schema, root, selections, 1, options);
  return `{
${indent(selectionSet, 2)}
}`;
}

export function buildDefaultSelection(
  schema: GraphQLSchema,
  root: GraphQLObjectType,
  options: FieldBuilderOptions = {}
): string {
  const selections = autoSelectFields(schema, root, options.depthLimit ?? DEFAULT_DEPTH_LIMIT, options);
  return buildDocumentFromFields(schema, root, selections, options);
}

function renderSelectionSet(
  schema: GraphQLSchema,
  parent: GraphQLObjectType,
  selections: ParsedField[],
  depth: number,
  options: FieldBuilderOptions
): string {
  const fields = parent.getFields();
  return selections
    .map((field) => {
      if (field.name === '__typename') {
        return '__typename';
      }
      const schemaField = fields[field.name];
      if (!schemaField) {
        throw new InvalidArgsError(`Field "${field.name}" not found on type ${parent.name}.`);
      }
      const type = unwrapType(schemaField.type);
      if (field.selection && !isObjectLike(type)) {
        throw new InvalidArgsError(`Field "${field.name}" is not an object type and cannot accept subfields.`);
      }
      if (!field.selection && isObjectLike(type)) {
        throw new InvalidArgsError(`Field "${field.name}" requires subfields.`);
      }
      const selection = field.selection
        ? ` {
${indent(renderSelectionSet(schema, type as GraphQLObjectType, field.selection, depth + 1, options), 2)}
}`
        : '';
      return `${field.name}${selection}`;
    })
    .join('\n');
}

function autoSelectFields(
  schema: GraphQLSchema,
  parent: GraphQLObjectType,
  depthLimit: number,
  options: FieldBuilderOptions
): ParsedField[] {
  const selections: ParsedField[] = [];
  if (options.includeTypename !== false) {
    selections.push({ name: '__typename' });
  }
  const fields = parent.getFields();
  for (const field of Object.values(fields)) {
    if (isLeaf(field.type)) {
      selections.push({ name: field.name });
    } else if (depthLimit > 0 && isObjectLike(unwrapType(field.type))) {
      const child = unwrapType(field.type);
      selections.push({
        name: field.name,
        selection: autoSelectFields(schema, child as GraphQLObjectType, depthLimit - 1, options),
      });
    }
  }
  if (selections.length === 0) {
    throw new InvalidArgsError(`Type ${parent.name} has no selectable scalar fields. Use --fields to specify.`);
  }
  return selections;
}

function unwrapType(type: GraphQLType): GraphQLType {
  if (type instanceof GraphQLNonNull || type instanceof GraphQLList) {
    return unwrapType(type.ofType);
  }
  return type;
}

function isLeaf(type: GraphQLType): boolean {
  const unwrapped = unwrapType(type);
  return isScalarType(unwrapped) || isEnumType(unwrapped);
}

function isObjectLike(type: GraphQLType): boolean {
  const unwrapped = unwrapType(type);
  return isObjectType(unwrapped) || isInterfaceType(unwrapped);
}

function indent(value: string, spaces: number): string {
  return value
    .split('\n')
    .map((line) => ' '.repeat(spaces) + line)
    .join('\n');
}
