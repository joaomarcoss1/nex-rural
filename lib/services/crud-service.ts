import { createRecord, deleteRecord, listRecords, updateRecord, type BackendRecord, type QueryFilters } from "./base";

export function makeCrudService(table: string) {
  return {
    list: <T extends BackendRecord>(filters: QueryFilters = {}, fallback: T[] = []) => listRecords<T>(table, filters, fallback),
    create: <T extends BackendRecord>(record: T, fallback: T[] = []) => createRecord<T>(table, record, fallback),
    update: <T extends BackendRecord>(id: string, patch: Partial<T>, fallback: T[] = []) => updateRecord<T>(table, id, patch, fallback),
    remove: (id: string) => deleteRecord(table, id)
  };
}
