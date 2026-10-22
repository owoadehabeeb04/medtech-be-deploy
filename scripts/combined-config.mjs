import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
// The compiled entry sits at dist/app.js or dist/src/app.js depending on the package's tsconfig rootDir; use whichever was built.
const entryFor = (name, candidates) => candidates.find(candidate => existsSync(path.join(root, name, candidate))) || candidates[0];

export function portNumber(value, name) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${name} must be a valid port`);
  return port;
}

export function combinedConfig(env) {
  const port = portNumber(env.PORT || 10000, 'PORT');
  const merchantPort = portNumber(env.COMBINED_MERCHANT_PORT || 3000, 'COMBINED_MERCHANT_PORT');
  const experiencePort = portNumber(env.COMBINED_EXPERIENCE1_PORT || 6200, 'COMBINED_EXPERIENCE1_PORT');
  if (new Set([port, merchantPort, experiencePort]).size !== 3) throw new Error('The three listening ports must differ');

  const services = [
    { name: 'merchant', prefix: 'MERCHANT_ENV_', port: merchantPort, entry: entryFor('merchant', ['dist/src/app.js', 'dist/app.js']), health: '/api/v1/merchant/health' },
    { name: 'experience_1', prefix: 'EXPERIENCE1_ENV_', port: experiencePort, entry: entryFor('experience_1', ['dist/app.js', 'dist/src/app.js']), health: '/api/v1/main/health' },
  ].map(service => {
    const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !/^(MERCHANT_ENV_|EXPERIENCE1_ENV_)/.test(key)));
    for (const [key, value] of Object.entries(env)) {
      if (key.startsWith(service.prefix)) childEnv[key.slice(service.prefix.length)] = value;
    }
    Object.assign(childEnv, {
      PORT: String(service.port), HOST: '127.0.0.1', COMBINED_DEPLOYMENT: 'true',
      MERCHANT_INTERNAL_BASE_URL: `http://127.0.0.1:${merchantPort}`,
      EXPERIENCE1_INTERNAL_BASE_URL: `http://127.0.0.1:${experiencePort}`,
      NODE_ENV: childEnv.NODE_ENV || 'production', APP_ENV: childEnv.APP_ENV || 'production',
    });
    if (!childEnv.BASE_API_URL && env.RENDER_EXTERNAL_URL) childEnv.BASE_API_URL = env.RENDER_EXTERNAL_URL;
    return { ...service, env: childEnv };
  });
  for (const key of ['MERCHANT_INTERNAL_SECRET', 'MERCHANT_INTERNAL_KEY_ID']) {
    const values = services.map(service => service.env[key] || (key.endsWith('KEY_ID') ? 'experience_1' : ''));
    if (!values[0] || values[0] !== values[1]) throw new Error(`${key} must be configured consistently for both applications`);
  }
  return { port, services };
}
