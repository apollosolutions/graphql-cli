import { CommandDefinition } from '../command-registry.js';

export function buildHelpCommand(): CommandDefinition {
  return {
    name: 'help',
    summary: 'Show global or command-specific help',
    usage: 'gql help [command]',
    description: 'Displays the list of available commands or detailed help for a specific command.',
    handler: async (ctx) => {
      const target = ctx.args[0];

      if (!target) {
        ctx.io.stdout.write(ctx.registry.renderGlobalHelp());
        ctx.io.stdout.write('\n');
        return 0;
      }

      const helpText = await ctx.registry.renderCommandHelp(target, {
        args: ctx.args.slice(1),
        flags: ctx.flags,
      });
      if (!helpText) {
        ctx.io.stderr.write(`Unknown command "${target}".\n`);
        ctx.io.stdout.write(ctx.registry.renderGlobalHelp());
        ctx.io.stdout.write('\n');
        return 1;
      }

      ctx.io.stdout.write(helpText);
      ctx.io.stdout.write('\n');
      return 0;
    },
  };
}
