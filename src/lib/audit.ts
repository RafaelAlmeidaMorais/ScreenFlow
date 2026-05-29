import { prisma } from "@/lib/prisma";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";
export type AuditEntity = "COMPANY" | "USER" | "SCREEN" | "MEDIA" | "WIDGET";

export async function logAudit(params: {
  userId: string;
  companyId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
