import { makeCrudService } from "./crud-service";

export const documentLibraryService = makeCrudService("document_library_items");
export const officialTemplatesService = makeCrudService("official_templates");
export const commercialTemplatesService = makeCrudService("commercial_templates");
