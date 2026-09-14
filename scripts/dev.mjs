import { spawn } from 'node:child_process';

const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--port', '3300'],
  {
    stdio: 'inherit',
    shell: false,
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
