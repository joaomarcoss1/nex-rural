import { createRecord, listRecords, updateRecord, type BackendRecord, type QueryFilters } from "./base";

export function listVertices<T extends BackendRecord>(filters: QueryFilters = {}, fallback: T[] = []) {
  return listRecords<T>("property_vertices", filters, fallback);
}

export function saveVertex<T extends BackendRecord>(record: T, fallback: T[] = []) {
  return record.id ? updateRecord<T>("property_vertices", record.id, record, fallback) : createRecord<T>("property_vertices", record, fallback);
}

export function parseCoordinateCsv(csv: string) {
  return csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line, index) => {
      const [codigo, latitude, longitude, utmE, utmN, fuso, datum, altitude, confrontante, tipoLimite, observacao] = line
        .split(/[;,]/)
        .map((part) => part.trim());
      return {
        codigo,
        latitude: Number(latitude?.replace(",", ".")),
        longitude: Number(longitude?.replace(",", ".")),
        utmE,
        utmN,
        fuso,
        datum,
        altitude: Number(altitude?.replace(",", ".") || 0),
        confrontante,
        tipoLimite,
        observacao,
        sequencia: index + 1
      };
    });
}
