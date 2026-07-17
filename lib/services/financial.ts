import { createRecord, deleteRecord, listRecords, updateRecord, type BackendRecord, type QueryFilters } from "./base";

const table = "financial_entries";

export function listFinancialEntries<T extends BackendRecord>(filters: QueryFilters = {}, fallback: T[] = []) {
  return listRecords<T>(table, filters, fallback);
}

export function saveFinancialEntry<T extends BackendRecord>(record: T, fallback: T[] = []) {
  return record.id ? updateRecord<T>(table, record.id, record, fallback) : createRecord<T>(table, record, fallback);
}

export function deleteFinancialEntry(id: string) {
  return deleteRecord(table, id);
}
