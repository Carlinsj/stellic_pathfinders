import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const viteEntry = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const backendRoot = fileURLToPath(new URL('../backend', import.meta.url));
const backendEntry = fileURLToPath(new URL('../backend/node_modules/tsx/dist/cli.mjs', import.meta.url));
const forwardedArguments = process.argv.slice(2);

if (!existsSync(viteEntry)) {
  console.log('CampusFit dependencies are missing. Installing them now…');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const installation = spawnSync(npmCommand, ['install', '--no-audit', '--no-fund'], {
    cwd: repositoryRoot,
    stdio: 'inherit'
  });

  if (installation.status !== 0 || !existsSync(viteEntry)) {
    console.error('CampusFit could not install its dependencies.');
    process.exit(installation.status ?? 1);
  }
}

const shouldStartBackend = process.env.VITE_API_MODE !== 'local' && (
  existsSync(fileURLToPath(new URL('../.env', import.meta.url))) ||
  existsSync(fileURLToPath(new URL('../backend/.env', import.meta.url)))
);

if (shouldStartBackend && !existsSync(backendEntry)) {
  console.log('CampusFit backend dependencies are missing. Installing them now…');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const installation = spawnSync(npmCommand, ['install', '--no-audit', '--no-fund'], {
    cwd: backendRoot,
    stdio: 'inherit'
  });
  if (installation.status !== 0 || !existsSync(backendEntry)) {
    console.error('CampusFit could not install backend dependencies.');
    process.exit(installation.status ?? 1);
  }
}

const frontend = spawn(process.execPath, [viteEntry, ...forwardedArguments], {
  cwd: repositoryRoot,
  stdio: 'inherit'
});

const backend = shouldStartBackend ? spawn(process.execPath, [backendEntry, 'watch', 'src/server.ts'], {
  cwd: backendRoot,
  stdio: 'inherit'
}) : undefined;

const servers = [frontend, backend].filter(Boolean);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => servers.forEach((server) => server.kill(signal)));
}

frontend.on('error', (error) => {
  console.error(`CampusFit could not start: ${error.message}`);
  process.exit(1);
});

backend?.on('error', (error) => {
  console.error(`CampusFit backend could not start: ${error.message}`);
});

backend?.on('exit', (code) => {
  if (code) console.error(`CampusFit backend stopped with exit code ${code}; the frontend will use its local fallback.`);
});

frontend.on('exit', (code, signal) => {
  backend?.kill('SIGTERM');
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
