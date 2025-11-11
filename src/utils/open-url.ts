import { spawn } from 'node:child_process';

export interface OpenUrlResult {
  opened: boolean;
  reason?: string;
}

export interface OpenUrlOptions {
  disable?: boolean;
}

export async function openUrlInBrowser(url: string, options: OpenUrlOptions = {}): Promise<OpenUrlResult> {
  const disabledEnv = process.env.GQL_NO_BROWSER === '1';
  const disable = options.disable || disabledEnv;
  if (disable) {
    return { opened: false, reason: 'disabled' };
  }

  const platform = process.platform;
  let command: string;
  let args: string[];
  let useShell = false;

  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
    useShell = false;
  } else {
    command = 'xdg-open';
    args = [url];
  }

  return await new Promise<OpenUrlResult>((resolve) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
      shell: platform === 'win32',
    });

    child.on('error', () => {
      resolve({ opened: false, reason: 'failed' });
    });

    child.unref();
    resolve({ opened: true });
  });
}
