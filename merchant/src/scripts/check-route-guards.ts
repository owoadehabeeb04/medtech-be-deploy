/**
 * Fails (exit 1) if any route that sits behind authMiddleware has no permission guard.
 * This is what keeps access closed by default: a new route cannot ship until someone decides who may use it.
 *
 * Run: npm run check:route-guards
 */
import express from "express";
import registerRoutes from "../core/routes";

const app = express();
registerRoutes(app);

type Finding = { method: string; path: string };
const unguarded: Finding[] = [];
const guarded: Array<Finding & { guard: string }> = [];

const hasAuth = (handlers: any[]) => handlers.some((handler) => handler?.name === "authMiddleware");
const guardOf = (handlers: any[]) => handlers.find((handler) => handler?.guard)?.guard;

const prefixOf = (layer: any): string => {
  if (layer.path) return layer.path;
  const source: string = layer.regexp?.source || "";
  if (source === "^\\/?(?=\\/|$)") return "";
  const match = source.match(/^\^\\\/(.+?)\\\/\?\(\?=\\\/\|\$\)$/);
  return match ? "/" + match[1].replace(/\\\//g, "/") : "";
};

type Scoped = { path: string; auth: boolean; guard: any };

/**
 * Walk a router stack. Middleware mounted with `use(path, ...)` applies only to what is mounted
 * on that same path (or, when mounted with no path, to everything after it in the same stack).
 */
const walk = (stack: any[], prefix: string, inheritedAuth: boolean, inheritedGuard: any) => {
  const scoped: Scoped[] = [];

  const effective = (path: string) => {
    let auth = inheritedAuth;
    let guard = inheritedGuard;
    for (const entry of scoped) {
      if (entry.path === "" || entry.path === path) {
        auth = auth || entry.auth;
        guard = entry.guard || guard;
      }
    }
    return { auth, guard };
  };

  for (const layer of stack) {
    const layerPath = prefixOf(layer);

    if (layer.route) {
      const routeHandlers = layer.route.stack.map((entry: any) => entry.handle);
      const inherited = effective("");
      const routeAuth = inherited.auth || hasAuth(routeHandlers);
      const guard = guardOf(routeHandlers) || inherited.guard;
      for (const method of Object.keys(layer.route.methods)) {
        const entry = { method: method.toUpperCase(), path: prefix + layer.route.path };
        if (!routeAuth) continue; // public routes are intentionally open
        if (guard) guarded.push({ ...entry, guard: JSON.stringify(guard) });
        else unguarded.push(entry);
      }
    } else if (layer.name === "router" && layer.handle?.stack) {
      const inherited = effective(layerPath);
      walk(layer.handle.stack, prefix + layerPath, inherited.auth, inherited.guard);
    } else if (layer.handle?.name === "authMiddleware") {
      scoped.push({ path: layerPath, auth: true, guard: null });
    } else if (layer.handle?.guard) {
      scoped.push({ path: layerPath, auth: false, guard: layer.handle.guard });
    }
  }
};

walk((app as any)._router.stack, "", false, null);

console.log(`${guarded.length} authenticated routes are guarded.`);
if (unguarded.length > 0) {
  console.error(`\n${unguarded.length} authenticated route(s) have NO permission guard:`);
  unguarded.forEach((entry) => console.error(`  ${entry.method} ${entry.path}`));
  process.exit(1);
}
console.log("OK: no unguarded authenticated route.");
process.exit(0);
