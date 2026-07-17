import { makeCrudService } from "./crud-service";

export const companiesService = makeCrudService("companies");
export const companyUnitsService = makeCrudService("company_units");
