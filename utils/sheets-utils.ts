import { google } from 'googleapis';
import * as path from 'path';

const CREDENTIALS_PATH = path.resolve(__dirname, '../credentials/service-account.json');

function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

/**
 * Read all rows from a sheet tab. Returns rows as string arrays.
 * @param spreadsheetId - ID from the Sheet URL: /spreadsheets/d/<ID>/
 * @param range - e.g. "Sheet1!A1:Z" or just "Sheet1"
 */
export async function getSheetRows(spreadsheetId: string, range: string): Promise<string[][]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (res.data.values as string[][]) ?? [];
}

/**
 * Read sheet and return rows as objects using the first row as header keys.
 */
export async function getSheetAsObjects(
  spreadsheetId: string,
  range: string
): Promise<Record<string, string>[]> {
  const rows = await getSheetRows(spreadsheetId, range);
  if (rows.length < 2) return [];
  const [headers, ...dataRows] = rows;
  return dataRows.map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  );
}
