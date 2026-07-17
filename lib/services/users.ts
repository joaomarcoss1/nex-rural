import { makeCrudService } from "./crud-service";

export const usersService = makeCrudService("user_profiles");
export const rolesService = makeCrudService("roles");
export const permissionsService = makeCrudService("permissions");
export const userPermissionsService = makeCrudService("user_permissions");
export const clientPortalAccessService = makeCrudService("client_portal_access");
