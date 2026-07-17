import { createRecord, deleteRecord, listRecords, updateRecord, type BackendRecord, type QueryFilters } from "./base";

const table = "registry_records";

export function listRegistryRecords<T extends BackendRecord>(filters: QueryFilters = {}, fallback: T[] = []) {
  return listRecords<T>(table, filters, fallback);
}

export function saveRegistryRecord<T extends BackendRecord>(record: T, fallback: T[] = []) {
  return record.id ? updateRecord<T>(table, record.id, record, fallback) : createRecord<T>(table, record, fallback);
}

export function deleteRegistryRecord(id: string) {
  return deleteRecord(table, id);
}
