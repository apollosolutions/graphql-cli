import {
  buildSchema,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';
import { describe, expect, it } from 'vitest';

import { coerceVariables, VariableDefinition } from '../../src/vars/coerce.js';

const schemaSDL = /* GraphQL */ `
  input UserInput {
    name: String!
    age: Int
    roles: [Role!]
    contact: ContactInput
  }

  input ContactInput {
    email: String!
    smsOptIn: Boolean
  }

  enum Role {
    ADMIN
    EDITOR
    VIEWER
  }
`;

const schema = buildSchema(schemaSDL);
const RoleEnum = schema.getType('Role') as GraphQLEnumType;
const UserInput = schema.getType('UserInput') as GraphQLInputObjectType;

const stringList = new GraphQLList(new GraphQLNonNull(GraphQLString));

describe('VARMAPR', () => {
  it('coerces scalars', () => {
    const defs: VariableDefinition[] = [
      { name: 'id', type: GraphQLID },
      { name: 'count', type: GraphQLInt },
      { name: 'active', type: GraphQLBoolean },
    ];

    const result = coerceVariables(defs, {
      id: '123',
      count: '42',
      active: 'true',
    });

    expect(result).toEqual({ id: '123', count: 42, active: true });
  });

  it('coerces enums and lists', () => {
    const defs: VariableDefinition[] = [
      { name: 'role', type: RoleEnum },
      { name: 'tags', type: stringList },
    ];

    const result = coerceVariables(
      defs,
      {
        role: 'ADMIN',
        tags: 'one,two,three',
      },
      { splitLists: true }
    );

    expect(result.role).toBe('ADMIN');
    expect(result.tags).toEqual(['one', 'two', 'three']);
  });

  it('coerces input objects using dotted flags', () => {
    const defs: VariableDefinition[] = [
      { name: 'input', type: new GraphQLNonNull(UserInput) },
    ];

    const result = coerceVariables(defs, {
      'input.name': 'Jess',
      'input.age': '31',
      'input.roles': ['ADMIN', 'VIEWER'],
      'input.contact.email': 'jess@example.com',
      'input.contact.smsOptIn': 'false',
    });

    expect(result.input).toEqual({
      name: 'Jess',
      age: 31,
      roles: ['ADMIN', 'VIEWER'],
      contact: {
        email: 'jess@example.com',
        smsOptIn: false,
      },
    });
  });

  it('throws on missing required variables', () => {
    const defs: VariableDefinition[] = [
      { name: 'id', type: new GraphQLNonNull(GraphQLID) },
    ];

    expect(() => coerceVariables(defs, {})).toThrow('Missing required variable "id".');
  });

  it('throws on invalid enum', () => {
    const defs: VariableDefinition[] = [
      { name: 'role', type: RoleEnum },
    ];

    expect(() => coerceVariables(defs, { role: 'WRONG' })).toThrow('expected one of');
  });
});
