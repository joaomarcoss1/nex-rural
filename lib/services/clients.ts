import { createRecord, deleteRecord, listRecords, updateRecord, type BackendRecord, type QueryFilters } from "./base";

const table = "clients";

export function listClients<T extends BackendRecord>(filters: QueryFilters = {}, fallback: T[] = []) {
  return listRecords<T>(table, filters, fallback);
}

export function saveClient<T extends BackendRecord>(record: T, fallback: T[] = []) {
  return record.id ? updateRecord<T>(table, record.id, record, fallback) : createRecord<T>(table, record, fallback);
}

export async function deleteClient(id: string) {
  return deleteRecord(table, id);
}
