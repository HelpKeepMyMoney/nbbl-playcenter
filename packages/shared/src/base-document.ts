export const ENTERPRISE_ID = "enterprise_nbbl";
export const DEFAULT_TENANT_ID = "tenant_nbbl_phoenix";

export type DocumentStatus = "active" | "pending" | "inactive" | "deleted";

export interface BaseDocument {
  id: string;
  enterpriseId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  status: DocumentStatus;
  version: number;
  deletedAt?: string | null;
}

export function baseDocumentFields(
  id: string,
  actorId: string,
  enterpriseId: string,
  tenantId: string,
  status: DocumentStatus = "active"
): BaseDocument {
  const now = new Date().toISOString();
  return {
    id,
    enterpriseId,
    tenantId,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId,
    updatedBy: actorId,
    status,
    version: 1,
    deletedAt: null,
  };
}

export function bumpDocument<T extends BaseDocument>(
  doc: T,
  actorId: string,
  patch: Partial<T>
): T {
  return {
    ...doc,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
    version: doc.version + 1,
  };
}
