import pc from 'picocolors';

function supportsColor(stream?: NodeJS.WritableStream): boolean {
  const env = process.env;
  if (env.NO_COLOR === '1' || env.NO_COLOR === '') {
    return false;
  }
  if (env.FORCE_COLOR === '0') {
    return false;
  }
  if (env.FORCE_COLOR && env.FORCE_COLOR !== '0') {
    return true;
  }
  const target = stream ?? process.stdout;
  if (!target) {
    return false;
  }
  const ttyFlag = (target as NodeJS.WriteStream).isTTY;
  return Boolean(ttyFlag);
}

function apply(text: string, formatter: (value: string) => string, stream?: NodeJS.WritableStream): string {
  return supportsColor(stream) ? formatter(text) : text;
}

export function formatHeading(text: string, stream?: NodeJS.WritableStream): string {
  return apply(text, (value) => pc.bold(pc.cyan(value)), stream);
}

export function formatLabel(text: string, stream?: NodeJS.WritableStream): string {
  return apply(text, (value) => pc.bold(value), stream);
}

export function formatCommand(text: string, stream?: NodeJS.WritableStream): string {
  return apply(text, (value) => pc.bold(pc.green(value)), stream);
}

export function formatMuted(text: string, stream?: NodeJS.WritableStream): string {
  return apply(text, (value) => pc.dim(value), stream);
}

export function isColorEnabled(stream?: NodeJS.WritableStream): boolean {
  return supportsColor(stream);
}
