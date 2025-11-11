export type FieldToken =
  | { kind: 'Name'; value: string }
  | { kind: 'Comma' }
  | { kind: 'LBrace' }
  | { kind: 'RBrace' };

export interface ParsedField {
  name: string;
  selection?: ParsedField[];
}

export function parseFields(input: string): ParsedField[] {
  const tokens = tokenize(input);
  let index = 0;

  function peek(): FieldToken | undefined {
    return tokens[index];
  }

  function consume(): FieldToken {
    const token = tokens[index];
    if (!token) {
      throw new Error('Unexpected end of input.');
    }
    index += 1;
    return token;
  }

  function parseSelection(): ParsedField[] {
    const nodes: ParsedField[] = [];
    while (index < tokens.length) {
      const token = peek();
      if (!token || token.kind === 'RBrace') {
        break;
      }
      if (token.kind === 'Comma') {
        consume();
        continue;
      }
      if (token.kind !== 'Name') {
        throw new Error(`Unexpected token ${token.kind}.`);
      }
      const nameToken = consume();
      if (nameToken.kind !== 'Name') {
        throw new Error('Expected field name.');
      }
      let selection: ParsedField[] | undefined;
      if (peek()?.kind === 'LBrace') {
        consume();
        selection = parseSelection();
        const closing = consume();
        if (closing.kind !== 'RBrace') {
          throw new Error('Expected closing }');
        }
      }
      nodes.push({ name: nameToken.value, selection });
    }
    return nodes;
  }

  const selections = parseSelection();
  if (index < tokens.length) {
    throw new Error('Unexpected trailing tokens.');
  }
  return selections;
}

function tokenize(input: string): FieldToken[] {
  const tokens: FieldToken[] = [];
  let i = 0;
  while (i < input.length) {
    const char = input[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (char === ',') {
      tokens.push({ kind: 'Comma' });
      i += 1;
      continue;
    }
    if (char === '{') {
      tokens.push({ kind: 'LBrace' });
      i += 1;
      continue;
    }
    if (char === '}') {
      tokens.push({ kind: 'RBrace' });
      i += 1;
      continue;
    }
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(input.slice(i));
    if (!match) {
      throw new Error(`Unexpected character "${char}" at position ${i}.`);
    }
    tokens.push({ kind: 'Name', value: match[0] });
    i += match[0].length;
  }
  return tokens;
}
