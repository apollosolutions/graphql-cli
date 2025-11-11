import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as defaultInput, stdout as defaultOutput } from 'node:process';

import { CommandDefinition, FlagValues } from '../command-registry.js';
import { HeaderParseError, parseHeaderDirective } from '../http/headers.js';

const DEFAULT_CONFIG_NAME = '.gqlrc.yml';
const DEFAULT_DOCS_DIR = 'graphql';
const DEFAULT_ENV_FILE = '.env.example';
const AUTH_STRATEGIES = ['none', 'bearer', 'apikey', 'oauth2'] as const;
type AuthStrategy = (typeof AUTH_STRATEGIES)[number];

const DEFAULTS = {
  endpointName: 'api',
  endpointUrl: 'https://api.example.com/graphql',
  authStrategy: 'bearer' as AuthStrategy,
  envVars: {
    bearer: 'GQL_API_TOKEN',
    apikey: 'GQL_API_KEY',
    oauth2: 'GQL_OAUTH_ACCESS_TOKEN',
  },
};

interface InitAnswers {
  endpointName: string;
  endpointUrl: string;
  authStrategy: AuthStrategy;
  authEnvVar?: string;
  headers: Record<string, string>;
  includeDocuments: boolean;
  includeEnvExample: boolean;
  docs: DocsInfo;
  envExamplePath: string;
}

interface DocsInfo {
  root: string;
  configBase: string;
  operationsDir: string;
  fragmentsDir: string;
  operationsGlob: string;
  fragmentsGlob: string;
}

export function buildInitCommand(): CommandDefinition {
  return {
    name: 'init',
    summary: 'Scaffold gql config, docs, and env templates',
    usage:
      'gql init [--yes] [--endpoint-name <name>] [--endpoint-url <url>] [--auth-strategy <strategy>] [--path <file>] [--skip-docs] [--skip-env] [--force]',
    description:
      'Interactively (or non-interactively via --yes) generate .gqlrc.yml, sample GraphQL documents, and .env.example without overwriting existing files unless --force is supplied.',
    handler: async (ctx) => handleInit(ctx.flags, ctx.io),
  };
}

async function handleInit(flags: FlagValues, io: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream }): Promise<number> {
  const printTemplate = getBooleanFlag(flags, 'print-template');
  const yes = getBooleanFlag(flags, 'yes', 'y');
  const force = getBooleanFlag(flags, 'force', 'f') ?? false;
  const skipDocs = getBooleanFlag(flags, 'skip-docs') ?? false;
  const skipEnv = getBooleanFlag(flags, 'skip-env') ?? false;

  const configPath = path.resolve(process.cwd(), getStringFlag(flags, 'path') ?? DEFAULT_CONFIG_NAME);
  const docsDirInput = getStringFlag(flags, 'docs-dir') ?? DEFAULT_DOCS_DIR;
  const envFileInput = getStringFlag(flags, 'env-file') ?? DEFAULT_ENV_FILE;
  const headersFromFlags = parseHeaderFlags(flags);

  const allowPrompts = !printTemplate && !yes;
  const answers = await resolveInitAnswers(
    {
      endpointName: getStringFlag(flags, 'endpoint-name'),
      endpointUrl: getStringFlag(flags, 'endpoint-url'),
      authStrategy: getStringFlag(flags, 'auth-strategy'),
      authEnvVar: getStringFlag(flags, 'auth-env'),
      includeDocuments: !skipDocs,
      includeEnvExample: !skipEnv,
      docsDirInput,
      envFileInput,
      headers: headersFromFlags,
    },
    { allowPrompts }
  );

  const config = renderConfigTemplate(answers);

  if (printTemplate) {
    io.stdout.write(config);
    if (!config.endsWith('\n')) {
      io.stdout.write('\n');
    }
    return 0;
  }

  if (!force && (await pathExists(configPath))) {
    io.stderr.write(
      `Config file ${formatDisplayPath(configPath)} already exists. Re-run with --force or pick another --path.\n`
    );
    return 1;
  }

  await ensureParentDir(configPath);
  await fs.writeFile(configPath, config, { flag: force ? 'w' : 'wx' });
  io.stdout.write(`[init] Wrote ${formatDisplayPath(configPath)}\n`);

  if (answers.includeDocuments) {
    await scaffoldDocuments(answers.docs, { force, io });
  } else {
    io.stdout.write('[init] Skipped document scaffolding (use --skip-docs=false to re-enable)\n');
  }

  if (answers.includeEnvExample) {
    await scaffoldEnvExample(answers.envExamplePath, answers.authEnvVar, { force, io });
  } else {
    io.stdout.write('[init] Skipped .env.example generation (use --skip-env=false to re-enable)\n');
  }

  io.stdout.write(`\nScaffold complete for endpoint "${answers.endpointName}".\n`);
  io.stdout.write(`Try: gql ${answers.endpointName} --help\n`);
  return 0;
}

async function resolveInitAnswers(
  input: {
    endpointName?: string;
    endpointUrl?: string;
    authStrategy?: string;
    authEnvVar?: string;
    includeDocuments: boolean;
    includeEnvExample: boolean;
    docsDirInput: string;
    envFileInput: string;
    headers: Record<string, string>;
  },
  opts: { allowPrompts: boolean }
): Promise<InitAnswers> {
  const answers: Partial<InitAnswers> = {};
  let endpointName = input.endpointName?.trim();
  let endpointUrl = input.endpointUrl?.trim();
  let authStrategy = normalizeAuthStrategy(input.authStrategy);
  let authEnvVar = input.authEnvVar?.trim();

  if (!opts.allowPrompts) {
    endpointName = endpointName || DEFAULTS.endpointName;
    endpointUrl = endpointUrl || DEFAULTS.endpointUrl;
  } else {
    if (!defaultInput.isTTY || !defaultOutput.isTTY) {
      throw new Error('Cannot prompt without a TTY. Re-run with --yes or supply the required flags.');
    }
    const prompt = new PromptSession();
    try {
      endpointName =
        endpointName && endpointName.length > 0
          ? endpointName
          : await prompt.ask('Endpoint name', DEFAULTS.endpointName);
      endpointUrl =
        endpointUrl && endpointUrl.length > 0
          ? endpointUrl
          : await prompt.ask('Endpoint URL', DEFAULTS.endpointUrl);
      authStrategy = normalizeAuthStrategy(await prompt.ask('Auth strategy (none|bearer|apikey|oauth2)', authStrategy));
      if (authStrategy !== 'none') {
        authEnvVar =
          authEnvVar && authEnvVar.length > 0
            ? authEnvVar
            : await prompt.ask(
                `Auth env var (${DEFAULTS.envVars[authStrategy]})`,
                DEFAULTS.envVars[authStrategy]
              );
      }
    } finally {
      prompt.close();
    }
  }

  if (!endpointName || !endpointUrl) {
    throw new Error('Endpoint name and URL are required. Provide them via flags or interactive prompts.');
  }

  const normalizedUrl = normalizeEndpointUrl(endpointUrl);
  const docs = resolveDocsInfo(input.docsDirInput);
  const headers = { ...input.headers };

  if (authStrategy !== 'none') {
    const envVar = authEnvVar || DEFAULTS.envVars[authStrategy];
    authEnvVar = envVar;
    applyAuthHeaderDefaults(headers, authStrategy, envVar);
  } else {
    authEnvVar = undefined;
  }

  return {
    endpointName,
    endpointUrl: normalizedUrl,
    authStrategy,
    authEnvVar,
    headers,
    includeDocuments: input.includeDocuments,
    includeEnvExample: input.includeEnvExample,
    docs,
    envExamplePath: path.resolve(process.cwd(), input.envFileInput),
  };
}

function normalizeAuthStrategy(value?: string): AuthStrategy {
  if (!value) {
    return DEFAULTS.authStrategy;
  }
  const normalized = value.toLowerCase() as AuthStrategy;
  if (!AUTH_STRATEGIES.includes(normalized)) {
    throw new Error(
      `Unsupported auth strategy "${value}". Supported strategies: ${AUTH_STRATEGIES.join(', ')}.`
    );
  }
  return normalized;
}

function normalizeEndpointUrl(value: string): string {
  let candidate = value.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch (error) {
    throw new Error(`Invalid endpoint URL "${value}". Please provide a valid http(s) URL.`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https endpoints are supported.');
  }

  const normalized = parsed.toString().replace(/\/$/, '');
  return normalized;
}

function resolveDocsInfo(inputDir: string): DocsInfo {
  const absolute = path.resolve(process.cwd(), inputDir || DEFAULT_DOCS_DIR);
  let relative = path.relative(process.cwd(), absolute);
  if (!relative) {
    relative = '.';
  }
  if (relative !== '.' && !relative.startsWith('.')) {
    relative = `./${relative}`;
  }
  const configBase = relative.replace(/\\/g, '/').replace(/\/+$/, '') || '.';

  return {
    root: absolute,
    configBase,
    operationsDir: path.join(absolute, 'operations'),
    fragmentsDir: path.join(absolute, 'fragments'),
    operationsGlob: joinConfigPath(configBase, 'operations/**/*.graphql'),
    fragmentsGlob: joinConfigPath(configBase, 'fragments/**/*.graphql'),
  };
}

function joinConfigPath(base: string, suffix: string): string {
  const normalizedBase = base === '.' ? '.' : base.replace(/\/+$/, '');
  const sanitizedSuffix = suffix.replace(/^\/+/, '');

  if (normalizedBase === '.' || normalizedBase === './') {
    return `./${sanitizedSuffix}`;
  }

  return `${normalizedBase}/${sanitizedSuffix}`.replace(/\/{2,}/g, '/');
}

function renderConfigTemplate(answers: InitAnswers): string {
  const lines: string[] = [
    '# Generated by gql init',
    'version: 1',
    `defaultEndpoint: ${answers.endpointName}`,
    '',
    'endpoints:',
    `  ${answers.endpointName}:`,
    `    url: ${answers.endpointUrl}`,
  ];

  if (Object.keys(answers.headers).length > 0) {
    lines.push('    headers:');
    for (const [key, value] of Object.entries(answers.headers)) {
      lines.push(`      ${key}: ${formatYamlString(value)}`);
    }
  }

  if (answers.authStrategy !== 'none') {
    lines.push('    auth:');
    lines.push(`      strategy: ${answers.authStrategy}`);
    if (answers.authEnvVar) {
      lines.push(`      env: ${answers.authEnvVar}`);
    }
  }

  if (answers.includeDocuments) {
    lines.push('    documents:');
    lines.push(`      - ${answers.docs.operationsGlob}`);
    lines.push('    fragments:');
    lines.push(`      - ${answers.docs.fragmentsGlob}`);
  }

  lines.push(
    '    cache:',
    '      introspectionTTL: 3600',
    '    request:',
    '      timeoutMs: 20000'
  );

  return `${lines.join('\n')}\n`;
}

function formatYamlString(value: string): string {
  const escaped = value.replace(/"/g, '\\"');
  return `"${escaped}"`;
}

async function scaffoldDocuments(
  docs: DocsInfo,
  opts: { force: boolean; io: { stdout: NodeJS.WritableStream } }
): Promise<void> {
  await fs.mkdir(docs.operationsDir, { recursive: true });
  await fs.mkdir(docs.fragmentsDir, { recursive: true });

  const sampleOperationPath = path.join(docs.operationsDir, 'SampleQuery.graphql');
  await writeScaffoldFile(
    sampleOperationPath,
    SAMPLE_OPERATION_CONTENT,
    opts
  );

  const sampleFragmentPath = path.join(docs.fragmentsDir, 'UserFields.graphql');
  await writeScaffoldFile(
    sampleFragmentPath,
    SAMPLE_FRAGMENT_CONTENT,
    opts
  );
}

async function scaffoldEnvExample(
  envPath: string,
  authEnvVar: string | undefined,
  opts: { force: boolean; io: { stdout: NodeJS.WritableStream } }
): Promise<void> {
  const envContent = buildEnvExample(authEnvVar);
  await ensureParentDir(envPath);
  await writeScaffoldFile(envPath, envContent, opts);
}

async function writeScaffoldFile(
  filePath: string,
  content: string,
  opts: { force: boolean; io: { stdout: NodeJS.WritableStream } }
): Promise<void> {
  const flag = opts.force ? 'w' : 'wx';
  try {
    await fs.writeFile(filePath, content, { flag });
    opts.io.stdout.write(`[init] Wrote ${formatDisplayPath(filePath)}\n`);
  } catch (error) {
    if (isNodeError(error) && error.code === 'EEXIST') {
      opts.io.stdout.write(`[init] Skipped existing ${formatDisplayPath(filePath)} (use --force to overwrite)\n`);
      return;
    }
    throw error;
  }
}

function buildEnvExample(authEnvVar?: string): string {
  const lines = ['# gql init generated example env file'];
  if (authEnvVar) {
    lines.push(`${authEnvVar}=`);
  } else {
    lines.push('# Add your endpoint secrets here (e.g., API tokens)');
  }
  return `${lines.join('\n')}\n`;
}

class PromptSession {
  private readonly rl = createInterface({ input: defaultInput, output: defaultOutput });

  async ask(question: string, defaultValue: string): Promise<string> {
    const suffix = defaultValue ? ` (${defaultValue})` : '';
    const answer = (await this.rl.question(`${question}${suffix}: `)).trim();
    return answer.length > 0 ? answer : defaultValue;
  }

  close(): void {
    this.rl.close();
  }
}

function parseHeaderFlags(flags: FlagValues): Record<string, string> {
  const raw = extractArrayFlag(flags, 'header', 'headers');
  const headers: Record<string, string> = {};

  for (const entry of raw) {
    try {
      const directive = parseHeaderDirective(entry);
      if (directive.action === 'remove') {
        throw new HeaderParseError('Header removals are not supported when scaffolding configs.');
      }
      headers[directive.name] = directive.value ?? '';
    } catch (error) {
      if (error instanceof HeaderParseError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  return headers;
}

function extractArrayFlag(flags: FlagValues, ...keys: string[]): string[] {
  const values: string[] = [];
  for (const key of keys) {
    const raw = flags[key];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === 'string') {
          values.push(item);
        }
      }
    } else if (typeof raw === 'string') {
      values.push(raw);
    }
  }
  return values;
}

function applyAuthHeaderDefaults(headers: Record<string, string>, strategy: AuthStrategy, envVar: string): void {
  if (strategy === 'bearer' || strategy === 'oauth2') {
    if (!hasHeader(headers, 'Authorization')) {
      headers['Authorization'] = `Bearer \${${envVar}}`;
    }
  } else if (strategy === 'apikey') {
    if (!hasHeader(headers, 'X-API-KEY')) {
      headers['X-API-KEY'] = `\${${envVar}}`;
    }
  }
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const target = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
}

function getStringFlag(flags: FlagValues, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = flags[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function getBooleanFlag(flags: FlagValues, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = flags[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      if (value === '') {
        return true;
      }
      if (/^(true|false)$/i.test(value)) {
        return value.toLowerCase() === 'true';
      }
    }
  }
  return false;
}

function formatDisplayPath(target: string): string {
  const relative = path.relative(process.cwd(), target);
  return relative && !relative.startsWith('..') ? relative || '.' : target;
}

async function ensureParentDir(targetFile: string): Promise<void> {
  await fs.mkdir(path.dirname(targetFile), { recursive: true });
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

const SAMPLE_OPERATION_CONTENT = `# graphql/operations/SampleQuery.graphql
query SampleQuery($id: ID!) {
  node(id: $id) {
    id
    __typename
  }
}
`;

const SAMPLE_FRAGMENT_CONTENT = `# graphql/fragments/UserFields.graphql
fragment UserFields on User {
  id
  name
  email
}
`;

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error) && typeof error === 'object' && 'code' in (error as NodeJS.ErrnoException);
}
