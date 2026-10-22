import { NextFunction, Request, Response } from "express";
import { MerchantAuditLog } from "./MerchantAuditLog.model";

export interface AuditActor {
  merchantId: string;
  actorType: "owner" | "member";
  actorId: string;
  actorName?: string | null;
}

export class AuditService {
  /** Fire-and-forget: a logging failure must never fail the action it describes. */
  static record(
    actor: AuditActor,
    action: string,
    entityId?: string | null,
    metadata?: Record<string, unknown> | null
  ): void {
    MerchantAuditLog.create({
      merchantId: actor.merchantId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      actorName: actor.actorName || null,
      action,
      entityId: entityId || null,
      metadata: metadata || null,
    }).catch((error: any) => console.error("[Audit] Failed to record", action, error?.message));
  }

  static actorFromRequest(req: Request): AuditActor | null {
    const user = req.context.user;
    if (!user) return null;
    return {
      merchantId: String(user.id),
      actorType: user.actor === "member" ? "member" : "owner",
      actorId: String(user.memberId || user.id),
      actorName: user.name || null,
    };
  }
}

/** Route middleware: records the action once the response succeeded (status < 400). */
export const audit = (action: string) => (req: Request, res: Response, next: NextFunction) => {
  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    const actor = AuditService.actorFromRequest(req);
    if (!actor) return;
    const entityId =
      String(req.params.id || req.params.orderId || req.params.reviewId || req.params.memberId || req.params.roleId || "") || null;
    AuditService.record(actor, action, entityId, { method: req.method, path: req.originalUrl.split("?")[0] });
  });
  next();
};
