import { createRecord, downloadDocumentFile, listRecords, softDeleteRecord, updateRecord, uploadDocumentFile, type BackendRecord, type QueryFilters } from "./base";

const table = "documents";

export function listDocuments<T extends BackendRecord>(filters: QueryFilters = {}, fallback: T[] = []) {
  return listRecords<T>(table, filters, fallback);
}

export function saveDocument<T extends BackendRecord>(record: T, fallback: T[] = []) {
  return record.id ? updateRecord<T>(table, record.id, record, fallback) : createRecord<T>(table, record, fallback);
}

export const uploadDocument = uploadDocumentFile;
export const downloadDocument = downloadDocumentFile;
export const archiveDocument = (id: string) => softDeleteRecord(table, id);
