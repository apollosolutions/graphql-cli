import yargsParser, { Arguments } from 'yargs-parser';
import { mapErrorToExitInfo } from './errors/exit.js';
import { formatHeading, formatLabel, formatCommand, formatMuted } from './output/colors.js';

export type FlagValues = Record<string, unknown>;

export interface CommandIO {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
}

export interface CommandContext {
  args: string[];
  flags: FlagValues;
  rawArgv: string[];
  io: CommandIO;
  registry: CommandRegistry;
}

export type CommandHandler = (ctx: CommandContext) => Promise<number | void> | number | void;

export interface CommandHelpContext {
  flags?: FlagValues;
  args?: string[];
}

export interface CommandDefinition {
  name: string;
  summary: string;
  usage?: string;
  description?: string;
  examples?: string[];
  label?: string;
  aliases?: string[];
  matcher?: CommandMatcher;
  handler: CommandHandler;
  renderHelp?: (ctx?: CommandHelpContext) => Promise<string> | string;
}

export interface RegisteredCommand extends CommandDefinition {
  label: string;
}

export type CommandMatcher = (input: ParsedInput) => boolean;

interface ParsedInput {
  positionals: string[];
  flags: FlagValues;
}

interface RegistryOptions {
  version: string;
}

const INTERNAL_COMMANDS = new Set(['help', 'completions', 'init', 'render-json', 'schema', 'ops', 'explore']);

interface ParsedResult {
  positionals: string[];
  flags: FlagValues;
  helpRequested: boolean;
  versionRequested: boolean;
}

interface MatchedCommand {
  command: RegisteredCommand;
  args: string[];
}

export interface CommandSummary {
  name: string;
  label: string;
  summary: string;
  usage?: string;
}

export class CommandRegistry {
  private readonly commands = new Map<string, RegisteredCommand>();
  private readonly aliases = new Map<string, string>();
  private readonly ordered: RegisteredCommand[] = [];

  constructor(private readonly options: RegistryOptions) {}

  register(definition: CommandDefinition): void {
    if (this.commands.has(definition.name)) {
      throw new Error(`Command "${definition.name}" is already registered.`);
    }

    const entry: RegisteredCommand = {
      ...definition,
      label: definition.label ?? definition.name,
      aliases: definition.aliases ?? [],
    };

    this.commands.set(definition.name, entry);
    this.ordered.push(entry);

    for (const alias of entry.aliases ?? []) {
      if (this.aliases.has(alias)) {
        throw new Error(`Alias "${alias}" is already registered.`);
      }
      this.aliases.set(alias, definition.name);
    }
  }

  get(name: string): RegisteredCommand | undefined {
    const resolved = this.commands.get(name) ?? this.commands.get(this.aliases.get(name) ?? '');
    return resolved;
  }

  list(): CommandSummary[] {
    return this.ordered.map((command) => ({
      name: command.name,
      label: command.label,
      summary: command.summary,
      usage: command.usage,
    }));
  }

  renderGlobalHelp(stream?: NodeJS.WritableStream): string {
    const summaries = this.list();
    const lines: string[] = [];

    const { adHoc, internal, endpoints } = partitionSummaries(summaries);

    lines.push(formatHeading(`gql v${this.options.version} — GraphQL from your terminal`, stream));
    lines.push('');

    lines.push(renderSection('Ad-hoc Usage:', adHoc, 'Use URLs directly (no config required).', stream));
    lines.push('');
    lines.push(
      renderSection('Endpoint Usage:', endpoints, 'No endpoints detected. Run "gql init" to scaffold a config.', stream)
    );
    lines.push('');
    lines.push(renderSection('Internal commands:', internal, undefined, stream));
    lines.push('');
    lines.push(renderHelpTips(stream));

    return lines.join('\n');
  }

  async renderCommandHelp(
    nameOrCommand: string | RegisteredCommand,
    ctx?: CommandHelpContext
  ): Promise<string | undefined> {
    const command = typeof nameOrCommand === 'string' ? this.get(nameOrCommand) : nameOrCommand;

    if (!command) {
      return undefined;
    }

    if (command.renderHelp) {
      return await command.renderHelp(ctx);
    }

    const lines: string[] = [];
    lines.push(`${formatLabel('Usage:')} ${command.usage ?? `gql ${command.label}`}`);
    lines.push(`${formatLabel('Summary:')} ${command.summary}`);
    if (command.description) {
      lines.push('');
      lines.push(command.description);
    }

    if (command.examples && command.examples.length > 0) {
      lines.push('');
      lines.push(formatLabel('Examples:'));
      for (const example of command.examples) {
        lines.push(`  ${example}`);
      }
    }

    return lines.join('\n');
  }

  async run(argv: string[], io?: Partial<CommandIO>): Promise<number> {
    const streams: CommandIO = {
      stdout: io?.stdout ?? process.stdout,
      stderr: io?.stderr ?? process.stderr,
    };

    const parsed = this.parseArgv(argv);

    if (parsed.versionRequested) {
      streams.stdout.write(`${this.options.version}\n`);
      return 0;
    }

    const initialCommandName = parsed.positionals[0];
    let command = initialCommandName ? this.get(initialCommandName) : undefined;
    let args = initialCommandName ? parsed.positionals.slice(1) : parsed.positionals;

    if (!command) {
      const matched = this.matchFallback(parsed);
      if (matched) {
        command = matched.command;
        args = matched.args;
      }
    }

    if (!command) {
      if (!initialCommandName || parsed.helpRequested) {
        streams.stdout.write(this.renderGlobalHelp(streams.stdout));
        streams.stdout.write('\n');
        return 0;
      }

      streams.stderr.write(`Unknown command "${initialCommandName}". Run "gql --help" for a list of commands.\n`);
      return 1;
    }

    if (parsed.helpRequested && command.name !== 'help') {
      const help = await this.renderCommandHelp(command, { flags: parsed.flags, args });
      if (help) {
        streams.stdout.write(help);
        streams.stdout.write('\n');
        return 0;
      }
    }

    try {
      const result = await command.handler({
        args,
        flags: parsed.flags,
        rawArgv: argv,
        io: streams,
        registry: this,
      });

      return typeof result === 'number' ? result : 0;
    } catch (error) {
      const info = mapErrorToExitInfo(error, { env: process.env });
      streams.stderr.write(`${info.message}\n`);
      if (info.hint) {
        streams.stderr.write(`${info.hint}\n`);
      }
      if (info.stack) {
        streams.stderr.write(`${info.stack}\n`);
      }
      return info.code;
    }
  }

  private parseArgv(argv: string[]): ParsedResult {
    const parsed = yargsParser(argv, {
      configuration: {
        'camel-case-expansion': false,
        'strip-aliased': false,
        'dot-notation': true,
        'populate--': true,
      },
      alias: {
        h: 'help',
        v: 'version',
      },
      boolean: ['help', 'version'],
    }) as Arguments & { help?: boolean; version?: boolean };

    const { _, help, version, $0, '--': doubleDash, ...rest } = parsed;
    const positionals = (_ ?? []).map(String);

    const flags: FlagValues = { ...rest };
    if (doubleDash) {
      flags['--'] = doubleDash;
    }

    return {
      positionals,
      flags,
      helpRequested: Boolean(help),
      versionRequested: Boolean(version),
    };
  }

  private matchFallback(parsed: ParsedResult): MatchedCommand | undefined {
    const input: ParsedInput = {
      positionals: parsed.positionals,
      flags: parsed.flags,
    };

    for (const command of this.ordered) {
      if (!command.matcher) {
        continue;
      }

      if (command.matcher(input)) {
        return {
          command,
          args: parsed.positionals,
        };
      }
    }

    return undefined;
  }

}

function partitionSummaries(summaries: CommandSummary[]): {
  adHoc: CommandSummary[];
  endpoints: CommandSummary[];
  internal: CommandSummary[];
} {
  const adHoc = summaries.filter((entry) => entry.name === '@url-mode');
  const internal = summaries.filter((entry) => INTERNAL_COMMANDS.has(entry.name));
  const endpoints = summaries.filter(
    (entry) => entry.name !== '@url-mode' && !INTERNAL_COMMANDS.has(entry.name)
  );
  return { adHoc, endpoints, internal };
}

function renderSection(
  title: string,
  entries: CommandSummary[],
  emptyText?: string,
  stream?: NodeJS.WritableStream
): string {
  const lines: string[] = [formatLabel(title, stream)];
  if (entries.length === 0) {
    if (emptyText) {
      lines.push(`  ${formatMuted(emptyText, stream)}`);
    }
    return lines.join('\n');
  }
  const width = entries.reduce((max, entry) => Math.max(max, entry.label.length), 0) + 2;
  for (const entry of entries) {
    const padded = entry.label.padEnd(width, ' ');
    const summary = entry.summary ?? '';
    lines.push(`  ${formatCommand(padded, stream)}${summary}`.trimEnd());
  }
  return lines.join('\n');
}

function renderHelpTips(stream?: NodeJS.WritableStream): string {
  const lines: string[] = [formatLabel('How to use the CLI:', stream)];
  const tips = [
    'Run `gql help <command>` or `gql <endpoint> --help` for focused guidance.',
    'Use `--select` with `--format table|ndjson` to reshape responses quickly.',
    'Colors follow TTY detection; set NO_COLOR=1 to disable or FORCE_COLOR=1 to enable.',
    'Docs live in the repo under docs/*.md for deeper dives.',
  ];
  for (const tip of tips) {
    lines.push(`  ${formatMuted(`- ${tip}`, stream)}`);
  }
  return lines.join('\n');
}
