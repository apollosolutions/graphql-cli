export enum ExitCode {
  Success = 0,
  InvalidInput = 2,
  Schema = 3,
  GraphQL = 4,
  Network = 5,
  Internal = 6,
}

export interface ExitInfo {
  code: ExitCode;
  message: string;
  hint?: string;
  stack?: string;
}

export interface ExitOptions {
  env?: NodeJS.ProcessEnv;
  debug?: boolean;
}

export class GqlError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode,
    public readonly hint?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class InvalidArgsError extends GqlError {
  constructor(message: string, hint?: string, options?: ErrorOptions) {
    super(message, ExitCode.InvalidInput, hint, options);
  }
}

export class SchemaError extends GqlError {
  constructor(message: string, hint?: string, options?: ErrorOptions) {
    super(message, ExitCode.Schema, hint, options);
  }
}

export class GraphQLExecutionError extends GqlError {
  constructor(message: string, hint?: string, options?: ErrorOptions) {
    super(message, ExitCode.GraphQL, hint, options);
  }
}

export class NetworkError extends GqlError {
  constructor(message: string, hint?: string, options?: ErrorOptions) {
    super(message, ExitCode.Network, hint, options);
  }
}

export class InternalError extends GqlError {
  constructor(message: string, hint?: string, options?: ErrorOptions) {
    super(message, ExitCode.Internal, hint, options);
  }
}

export function mapErrorToExitInfo(error: unknown, options: ExitOptions = {}): ExitInfo {
  const env = options.env ?? process.env;
  const debugEnabled = options.debug ?? env?.GQL_DEBUG === '1';

  if (error instanceof GqlError) {
    return {
      code: error.exitCode,
      message: error.message,
      hint: error.hint,
      stack: debugEnabled ? error.stack : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      code: ExitCode.Internal,
      message: 'Unexpected error. Rerun with GQL_DEBUG=1 for details.',
      stack: debugEnabled ? error.stack ?? error.message : undefined,
    };
  }

  return {
    code: ExitCode.Internal,
    message: 'Unknown failure (non-error thrown). Rerun with GQL_DEBUG=1 for details.',
    stack: debugEnabled ? String(error) : undefined,
  };
}
