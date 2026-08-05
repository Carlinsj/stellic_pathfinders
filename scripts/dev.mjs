import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const viteEntry = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const forwardedArguments = process.argv.slice(2);

if (!existsSync(viteEntry)) {
  console.log('CampusFit dependencies are missing. Installing them now…');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const installation = spawnSync(npmCommand, ['install', '--no-audit', '--no-fund'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: 'inherit'
  });

  if (installation.status !== 0 || !existsSync(viteEntry)) {
    console.error('CampusFit could not install its dependencies.');
    process.exit(installation.status ?? 1);
  }
}

const server = spawn(process.execPath, [viteEntry, ...forwardedArguments], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  stdio: 'inherit'
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}

server.on('error', (error) => {
  console.error(`CampusFit could not start: ${error.message}`);
  process.exit(1);
});

server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
