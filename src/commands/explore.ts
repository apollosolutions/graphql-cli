import { CommandDefinition } from '../command-registry.js';
import { InvalidArgsError } from '../errors/exit.js';
import { getStringFlag } from './flag-helpers.js';
import { resolveTarget } from './target.js';
import { openUrlInBrowser } from '../utils/open-url.js';

export function buildExploreCommand(): CommandDefinition {
  return {
    name: 'explore',
    summary: 'Open Apollo Sandbox for a URL or named endpoint',
    usage: 'gql explore [<endpoint|url>] [--endpoint <name>] [--url <url>] [--print]',
    description:
      'Launches https://studio.apollographql.com/sandbox/explorer pointed at the specified GraphQL endpoint. Works for both ad-hoc URLs and endpoints from .gqlrc.* configs.',
    handler: async (ctx) => {
      const targetArg = ctx.args[0];
      const urlFlag = getStringFlag(ctx.flags, 'url');
      const endpointFlag = getStringFlag(ctx.flags, 'endpoint');
      const printOnly = isTruthyFlag(ctx.flags.print);

      if (urlFlag && endpointFlag) {
        throw new InvalidArgsError('Specify either --url or --endpoint, not both.');
      }

      const target = await resolveTarget({
        targetArg,
        urlFlag,
        endpointFlag,
        headers: [],
      });

      const sandboxUrl = buildSandboxUrl(target.url);
      let opened = false;

      if (!printOnly) {
        const result = await openUrlInBrowser(sandboxUrl);
        opened = result.opened;
      }

      if (opened) {
        ctx.io.stdout.write(`Opening Apollo Sandbox for ${target.label} → ${sandboxUrl}\n`);
      } else {
        ctx.io.stdout.write(`Apollo Sandbox URL for ${target.label}: ${sandboxUrl}\n`);
        ctx.io.stdout.write('Open the link in your browser to explore the schema.\n');
      }

      return 0;
    },
  };
}

function buildSandboxUrl(endpointUrl: string): string {
  const encoded = encodeURIComponent(endpointUrl);
  return `https://studio.apollographql.com/sandbox/explorer?endpoint=${encoded}`;
}

function isTruthyFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value === '' || value.toLowerCase() === 'true';
  }
  return false;
}
