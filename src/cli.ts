import packageJson from '../package.json' with { type: 'json' };
import { CommandDefinition, CommandIO, CommandRegistry } from './command-registry.js';
import { buildCompletionsCommand } from './commands/completions.js';
import { buildHelpCommand } from './commands/help.js';
import { buildInitCommand } from './commands/init.js';
import { buildRenderJsonCommand } from './commands/render-json.js';
import { buildOpsCommand } from './commands/ops.js';
import { buildSchemaCommand } from './commands/schema.js';
import { buildExploreCommand } from './commands/explore.js';
import { buildUrlModeCommand } from './commands/url-mode.js';
import { loadConfig, ConfigNotFoundError } from './config/index.js';
import { buildEndpointCommand } from './project/endpoint-command.js';

const VERSION = packageJson.version ?? '0.0.0';

export async function createRegistry(argv?: string[]): Promise<CommandRegistry> {
  const registry = new CommandRegistry({ version: VERSION });

  registry.register(buildHelpCommand());
  registry.register(buildCompletionsCommand());
  registry.register(buildInitCommand());
  registry.register(buildRenderJsonCommand());
  registry.register(buildOpsCommand());
  registry.register(buildSchemaCommand());
  registry.register(buildExploreCommand());
  registry.register(buildUrlModeCommand());

  await registerEndpointCommands(registry, argv);

  return registry;
}

export async function runCli(argv: string[], io?: Partial<CommandIO>): Promise<number> {
  const registry = await createRegistry(argv);
  return registry.run(argv, io);
}

export async function runCliFromProcess(argv = process.argv.slice(2)): Promise<never> {
  const code = await runCli(argv);
  process.exit(code);
}

async function registerEndpointCommands(registry: CommandRegistry, argv?: string[]): Promise<void> {
  const firstArg = argv?.[0];
  if (firstArg === 'init') {
    return;
  }
  try {
    const loaded = await loadConfig();
    for (const [endpointName, endpointConfig] of Object.entries(loaded.config.endpoints)) {
      registry.register(
        buildEndpointCommand({
          endpointName,
          endpointConfig,
          configDir: loaded.rootDir,
        })
      );
    }
  } catch (error) {
    if (error instanceof ConfigNotFoundError) {
      return;
    }
    throw error;
  }
}
