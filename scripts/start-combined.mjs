import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createGateway } from '../gateway/server.mjs';
import { combinedConfig } from './combined-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { port, services } = combinedConfig(process.env);
const children = [];
const ready = new Set();
let stopping = false;
const gateway = createGateway({ services, isReady: () => !stopping && ready.size === services.length, trustProxy: process.env.RENDER === 'true' });
const startupDeadline = setTimeout(() => stop(1, 'Startup timed out'), 120000);

function stop(code, reason) {
  if (stopping) return;
  stopping = true;
  clearTimeout(startupDeadline);
  console.log(`[combined] ${reason}`);
  // Drain public requests while both backends are still available, then stop them.
  const force = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
    process.exit(code || 1);
  }, 25000);
  gateway.close(async () => {
    await Promise.all(children.map(child => new Promise(resolve => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once('exit', resolve);
      child.kill('SIGTERM');
    })));
    clearTimeout(force);
    process.exit(code);
  });
}

process.on('SIGTERM', () => stop(0, 'Shutting down'));
process.on('SIGINT', () => stop(0, 'Shutting down'));
gateway.on('error', () => stop(1, 'Gateway failed'));
gateway.listen(port, '0.0.0.0', () => {
  console.log(`[combined] Gateway listening on ${port}`);
  for (const service of services) {
    const cwd = path.join(root, service.name);
    const child = fork(path.join(cwd, service.entry), [], { cwd, env: service.env, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    children.push(child);
    child.on('error', () => stop(1, `${service.name} failed to start`));
    child.on('exit', () => stop(1, `${service.name} exited`));
    child.on('message', message => {
      if (stopping || message?.type !== 'ready' || ready.has(service.name)) return;
      ready.add(service.name);
      if (ready.size === services.length) {
        clearTimeout(startupDeadline);
        for (const process of children) process.send({ type: 'start-workers' });
        console.log('[combined] Both applications ready');
      }
    });
  }
});
