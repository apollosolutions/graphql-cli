import { buildSchema, GraphQLObjectType } from 'graphql';
import { describe, expect, it } from 'vitest';

import { buildDefaultSelection, buildDocumentFromFields } from '../../src/fields/builder.js';
import { parseFields } from '../../src/fields/parser.js';

const schemaSDL = /* GraphQL */ `
  type Profile {
    id: ID!
    bio: String
    contact: Contact
  }

  type Contact {
    email: String!
    phone: String
  }

  type Query {
    me: Profile
    hello: String!
  }
`;

const schema = buildSchema(schemaSDL);
const queryType = schema.getType('Query') as GraphQLObjectType;

describe('fields builder', () => {
  it('builds document from custom fields', () => {
    const selections = parseFields('me { id, contact { email } }');
    const doc = buildDocumentFromFields(schema, queryType, selections);
    expect(doc).toContain('me');
    expect(doc).toContain('contact');
  });

  it('throws on invalid field names', () => {
    const selections = parseFields('unknown');
    expect(() => buildDocumentFromFields(schema, queryType, selections)).toThrow('Field "unknown" not found');
  });

  it('builds default selection', () => {
    const doc = buildDefaultSelection(schema, queryType, { depthLimit: 2 });
    expect(doc).toContain('hello');
  });
});
