import { CommandDefinition, CommandRegistry } from '../command-registry.js';
import { ConfigNotFoundError, loadConfig } from '../config/index.js';
import { collectEndpointOperationSummaries, EndpointOperationSummary } from '../project/endpoint-command.js';

type ShellRenderer = (data: CompletionTemplateData) => string;

interface CompletionTemplateData {
  commands: string[];
  endpoints: EndpointCompletionEntry[];
}

interface EndpointCompletionEntry {
  name: string;
  suggestions: string[];
}

const SHELL_RENDERERS: Record<string, ShellRenderer> = {
  bash: renderBashCompletion,
  zsh: renderZshCompletion,
  fish: renderFishCompletion,
};

const ZSH_OPS_EXPANSION = '${=_gql_endpoint_ops[$endpoint]}';

export function buildCompletionsCommand(): CommandDefinition {
  return {
    name: 'completions',
    summary: 'Print shell completion snippet',
    usage: 'gql completions [bash|zsh|fish]',
    description: 'Outputs a shell completion script populated with endpoints, operations, aliases, and common commands.',
    handler: async (ctx) => {
      const shell = (ctx.args[0] ?? 'bash').toLowerCase();
      const renderer = SHELL_RENDERERS[shell];

      if (!renderer) {
        ctx.io.stderr.write(`Unsupported shell "${shell}". Supported shells: ${Object.keys(COMPLETION_SNIPPETS).join(', ')}.\n`);
        return 1;
      }

      const data = await buildCompletionData(ctx.registry);
      const snippet = renderer(data);
      ctx.io.stdout.write(`${snippet}\n`);
      return 0;
    },
  };
}

async function buildCompletionData(registry: CommandRegistry): Promise<CompletionTemplateData> {
  const commandNames = registry
    .list()
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('@'));

  const endpoints: EndpointCompletionEntry[] = [];
  try {
    const { config } = await loadConfig();
    for (const [name, endpointConfig] of Object.entries(config.endpoints)) {
      const summaries = await collectEndpointOperationSummaries(endpointConfig);
      const visible = new Set<string>();
      for (const summary of summaries) {
        if (summary.hidden) {
          continue;
        }
        visible.add(summary.canonicalName);
        visible.add(summary.displayName);
      }
      const aliases = endpointConfig.aliases ? Object.keys(endpointConfig.aliases) : [];
      for (const alias of aliases) {
        visible.add(alias);
      }
      endpoints.push({
        name,
        suggestions: Array.from(visible).filter(Boolean).sort(),
      });
    }
  } catch (error) {
    if (!(error instanceof ConfigNotFoundError)) {
      throw error;
    }
  }

  return {
    commands: Array.from(new Set(commandNames)).sort(),
    endpoints,
  };
}

function renderBashCompletion(data: CompletionTemplateData): string {
  const commandsList = data.commands.map(shellQuote).join(' ');
  let script = [
    '# bash completion for gql',
    `_gql_commands=(${commandsList})`,
    'declare -A _gql_endpoint_ops',
  ].join('\n');

  for (const endpoint of data.endpoints) {
    const ops = endpoint.suggestions.map(shellQuote).join(' ');
    script += `\n_gql_endpoint_ops[${shellQuote(endpoint.name)}]="${ops}"`;
  }

  script += `
_gql_complete() {
  local cur words cword
  cur="\${COMP_WORDS[COMP_CWORD]}"
  if [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${_gql_commands[*]}" -- "$cur") )
    return
  fi

  local endpoint="\${COMP_WORDS[1]}"
  if [[ -n "\${_gql_endpoint_ops[$endpoint]}" ]]; then
    COMPREPLY=( $(compgen -W "\${_gql_endpoint_ops[$endpoint]}" -- "$cur") )
    return
  fi

  if [[ "$cur" == -* ]]; then
    COMPREPLY=( $(compgen -W "--help --version" -- "$cur") )
  fi
}
complete -F _gql_complete gql`;

  return script.trim();
}

function renderZshCompletion(data: CompletionTemplateData): string {
  const commandsList = data.commands.map(shellQuote).join(' ');
  let script = [
    '#compdef gql',
    '',
    `_gql_commands=(${commandsList})`,
    'typeset -A _gql_endpoint_ops',
  ].join('\n');

  for (const endpoint of data.endpoints) {
    const ops = endpoint.suggestions.map(shellQuote).join(' ');
    script += `\n_gql_endpoint_ops[${shellQuote(endpoint.name)}]="${ops}"`;
  }

  script += `
_gql() {
  local curcontext="$curcontext" state line
  if (( CURRENT == 2 )); then
    _describe 'command' _gql_commands
    return
  fi

  local endpoint=$words[2]
  if [[ -n \${_gql_endpoint_ops[$endpoint]} ]]; then
    local -a ops
    ops=(${ZSH_OPS_EXPANSION})
    _describe 'operation' ops
    return
  fi

  if [[ $words[CURRENT] == -* ]]; then
    _values 'flags' --help --version
  fi
}

compdef _gql gql`;

  return script.trim();
}

function renderFishCompletion(data: CompletionTemplateData): string {
  const commandsList = data.commands.map((cmd) => fishQuote(cmd)).join('\n  ');
  let script = [
    '# fish completion for gql',
    'function __gql_commands',
    `  printf "%s\\n" \\\n  ${commandsList}`,
    'end',
    '',
    'function __gql_ops_for_endpoint',
    '  set endpoint $argv[1]',
    '  switch $endpoint',
  ].join('\n');

  for (const endpoint of data.endpoints) {
    const opsList = endpoint.suggestions.map((op) => fishQuote(op)).join('\n      ');
    if (!opsList) continue;
    script += `\n    case ${fishQuote(endpoint.name)}\n      printf "%s\\n" \\\n      ${opsList}`;
  }

  script += `
    case '*'
      return
  end
end

function __gql_complete
  set -l tokens (commandline -opc)
  set -l current (commandline -ct)
  if test (count $tokens) -le 1
    __gql_commands
    return
  end

  set -l endpoint $tokens[2]
  __gql_ops_for_endpoint $endpoint
end

complete -c gql -f -a '(__gql_complete)'`;

  return script.trim();
}

function shellQuote(value: string): string {
  if (!value) {
    return "''";
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function fishQuote(value: string): string {
  if (!value) {
    return "''";
  }
  return `'${value.replace(/'/g, `\\'`)}'`;
}

const COMPLETION_SNIPPETS = SHELL_RENDERERS;
