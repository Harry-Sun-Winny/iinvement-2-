import type { TransactionImportRow } from "@/app/lib/api";

export const MAX_TRANSACTION_IMPORT_ROWS = 500;

type ImportField = keyof TransactionImportRow;

const HEADER_ALIASES: Record<ImportField, string[]> = {
  assetSymbol: ["assetsymbol", "symbol", "ticker", "ma", "mataisan"],
  assetName: ["assetname", "name", "company", "ten", "tentaisan"],
  type: ["type", "side", "loai", "loaigiaodich"],
  quantity: ["quantity", "qty", "soluong"],
  price: ["price", "gia"],
  currency: ["currency", "currencycode", "tiente", "matiente"],
  transactionDate: ["date", "transactiondate", "ngay", "ngaygiaodich"],
  notes: ["notes", "note", "ghichu"],
  fee: ["fee", "phi"],
};

const REQUIRED_FIELDS: ImportField[] = ["assetSymbol", "type", "quantity", "price", "transactionDate"];

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function detectDelimiter(csvText: string) {
  let quoted = false;
  let commas = 0;
  let semicolons = 0;
  let tabs = 0;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    if (character === '"') {
      if (quoted && csvText[index + 1] === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && (character === "\n" || character === "\r")) break;
    if (!quoted && character === ",") commas += 1;
    if (!quoted && character === ";") semicolons += 1;
    if (!quoted && character === "\t") tabs += 1;
  }

  if (tabs > commas && tabs > semicolons) return "\t";
  return semicolons > commas ? ";" : ",";
}

function parseRecords(csvText: string, delimiter: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    if (character === '"') {
      if (quoted && csvText[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      record.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csvText[index + 1] === "\n") index += 1;
      record.push(cell.trim());
      if (record.some(value => value.length > 0)) records.push(record);
      record = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  record.push(cell.trim());
  if (record.some(value => value.length > 0)) records.push(record);
  return records;
}

export function parseTransactionCsv(csvText: string): TransactionImportRow[] {
  const records = parseRecords(csvText.replace(/^\uFEFF/, ""), detectDelimiter(csvText));
  const header = records.shift();
  if (!header) throw new Error("CSV must include a header row.");

  const normalizedHeaders = header.map(normalizeHeader);
  const indexes = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
      field,
      normalizedHeaders.findIndex(headerName => aliases.includes(headerName)),
    ]),
  ) as Record<ImportField, number>;

  const missing = REQUIRED_FIELDS.filter(field => indexes[field] < 0);
  if (missing.length > 0) {
    throw new Error(`CSV is missing required columns: ${missing.join(", ")}.`);
  }
  if (records.length === 0) throw new Error("CSV must include at least one transaction.");
  if (records.length > MAX_TRANSACTION_IMPORT_ROWS) {
    throw new Error(`CSV can contain at most ${MAX_TRANSACTION_IMPORT_ROWS} transactions per import.`);
  }

  const value = (record: string[], field: ImportField) => {
    const index = indexes[field];
    return index >= 0 ? record[index] ?? "" : "";
  };
  const numberValue = (record: string[], field: ImportField) => {
    const rawValue = value(record, field);
    return rawValue === "" ? Number.NaN : Number(rawValue);
  };

  return records.map(record => ({
    assetSymbol: value(record, "assetSymbol"),
    assetName: value(record, "assetName"),
    type: value(record, "type"),
    quantity: numberValue(record, "quantity"),
    price: numberValue(record, "price"),
    currency: value(record, "currency") || "USD",
    transactionDate: value(record, "transactionDate"),
    notes: value(record, "notes"),
    fee: Number(value(record, "fee") || 0),
  }));
}
