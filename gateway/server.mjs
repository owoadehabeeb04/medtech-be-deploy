import http from 'node:http';

const hopHeaders = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];
function cleanHeaders(headers) {
  const result = { ...headers };
  for (const key of [...hopHeaders, ...String(headers.connection || '').toLowerCase().split(',').map(x => x.trim())]) delete result[key];
  return result;
}
function json(res, status, body) {
  if (res.headersSent || res.destroyed) return;
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export function createGateway({ services, isReady, trustProxy = false, timeoutMs = 60000, healthTimeoutMs = 3000 }) {
  const merchant = services.find(s => s.name === 'merchant');
  const experience = services.find(s => s.name === 'experience_1');
  let healthPromise;
  let healthResult;
  let checkedAt = 0;
  async function health() {
    if (!isReady()) return false;
    if (Date.now() - checkedAt < 2000) return healthResult;
    if (!healthPromise) {
      healthPromise = Promise.all(services.map(async service => {
        try {
          const response = await fetch(`http://127.0.0.1:${service.port}${service.health}`, { signal: AbortSignal.timeout(healthTimeoutMs) });
          await response.body?.cancel();
          return response.ok;
        } catch { return false; }
      })).then(results => {
        checkedAt = Date.now();
        healthResult = results.every(Boolean);
        return healthResult;
      }).finally(() => { healthPromise = undefined; });
    }
    return healthPromise;
  }

  return http.createServer(async (req, res) => {
    const original = req.url || '/';
    const pathname = original.split('?')[0];
    if (pathname === '/healthz' && ['GET', 'HEAD'].includes(req.method)) {
      const ready = await health();
      return json(res, ready ? 200 : 503, { status: ready ? 'ready' : 'not-ready' });
    }
    let target;
    let upstreamPath = original;
    let docsPrefix;
    if (/^\/api\/v1\/merchant(?:\/|$)/.test(pathname)) target = merchant;
    else if (/^\/api\/v1\/main(?:\/|$)/.test(pathname)) target = experience;
    else {
      for (const [prefix, service] of [['/docs/merchant', merchant], ['/docs/main', experience]]) {
        if (pathname === `${prefix}.json`) { target = service; upstreamPath = '/api-docs.json'; break; }
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
          if (pathname === prefix) { res.writeHead(302, { location: `${prefix}/${original.slice(pathname.length)}` }); return res.end(); }
          target = service;
          docsPrefix = prefix;
          upstreamPath = '/api-docs' + original.slice(prefix.length);
          break;
        }
      }
    }
    if (!target) return json(res, 404, { message: 'Route not found' });
    if (!isReady()) return json(res, 503, { message: 'Services are starting or shutting down' });

    const headers = cleanHeaders(req.headers);
    // Render is the only trusted upstream. Locally, disregard supplied forwarding headers.
    headers['x-forwarded-for'] = trustProxy ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : req.socket.remoteAddress;
    headers['x-forwarded-proto'] = trustProxy ? (req.headers['x-forwarded-proto'] || 'https') : 'http';
    delete headers.forwarded;
    delete headers['x-forwarded-host'];
    const upstream = http.request({ hostname: '127.0.0.1', port: target.port, method: req.method, path: upstreamPath, headers }, response => {
      const outgoing = cleanHeaders(response.headers);
      if (docsPrefix && outgoing.location?.startsWith('/api-docs')) outgoing.location = docsPrefix + outgoing.location.slice('/api-docs'.length);
      res.writeHead(response.statusCode || 502, outgoing);
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    upstream.setTimeout(timeoutMs, () => {
      json(res, 504, { message: 'Application request timed out' });
      upstream.destroy();
    });
    upstream.on('error', () => {
      if (res.headersSent) { if (!res.writableEnded) res.destroy(); }
      else json(res, 502, { message: 'Application is unavailable' });
    });
    req.on('aborted', () => upstream.destroy());
    req.on('error', () => upstream.destroy());
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    // Stream bytes unchanged: payment webhook and internal HMAC signatures depend on this.
    req.pipe(upstream);
  });
}
