export { auditAction } from "./base";
import { makeCrudService } from "./crud-service";

export const auditLogsService = makeCrudService("audit_logs");
