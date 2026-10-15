import { NextFunction, Request, RequestHandler, Response } from "express";
import { HttpException } from "@medtech/utils";
import { PermissionKey } from "../constants/permissions";

/**
 * Route guards. Every route behind authMiddleware must carry exactly one of these; the
 * `check:route-guards` script fails if one is missing, so access is closed by default.
 *
 *   requirePermission(...)     the caller must hold ALL listed permissions
 *   requireAnyPermission(...)  the caller must hold AT LEAST ONE
 *   ownerOnly()                only the pharmacy owner (never a team member)
 *   anyMember()                any signed-in person (owner or team member)
 *
 * The owner holds every permission. Team members hold what their role grants.
 */
export type GuardInfo =
  | { type: "permission"; permissions: PermissionKey[] }
  | { type: "any-permission"; permissions: PermissionKey[] }
  | { type: "owner" }
  | { type: "any-member" };

export type GuardedHandler = RequestHandler & { guard: GuardInfo };

const tag = (handler: RequestHandler, guard: GuardInfo): GuardedHandler => Object.assign(handler, { guard });

const forbidden = (message: string) => new HttpException(403, message);

const permissionsOf = (req: Request): string[] => req.context.user?.permissions || [];

export const requirePermission = (...required: PermissionKey[]): GuardedHandler =>
  tag((req: Request, _res: Response, next: NextFunction) => {
    if (!req.context.user) return next(new HttpException(401, "Authentication required"));
    const held = permissionsOf(req);
    if (required.every((permission) => held.includes(permission))) return next();
    return next(forbidden(`You don't have permission to do this (requires: ${required.join(", ")})`));
  }, { type: "permission", permissions: required });

export const requireAnyPermission = (...required: PermissionKey[]): GuardedHandler =>
  tag((req: Request, _res: Response, next: NextFunction) => {
    if (!req.context.user) return next(new HttpException(401, "Authentication required"));
    const held = permissionsOf(req);
    if (required.some((permission) => held.includes(permission))) return next();
    return next(forbidden(`You don't have permission to do this (requires one of: ${required.join(", ")})`));
  }, { type: "any-permission", permissions: required });

export const ownerOnly = (): GuardedHandler =>
  tag((req: Request, _res: Response, next: NextFunction) => {
    if (!req.context.user) return next(new HttpException(401, "Authentication required"));
    if (req.context.user.actor === "owner") return next();
    return next(forbidden("Only the pharmacy owner can do this"));
  }, { type: "owner" });

export const anyMember = (): GuardedHandler =>
  tag((req: Request, _res: Response, next: NextFunction) => {
    if (!req.context.user) return next(new HttpException(401, "Authentication required"));
    return next();
  }, { type: "any-member" });

export const hasPermission = (req: Request, permission: PermissionKey): boolean =>
  permissionsOf(req).includes(permission);
