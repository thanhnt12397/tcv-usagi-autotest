#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';

const CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS is not set');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: CREDENTIALS,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
});

const server = new Server(
  { name: 'google-sheets-sa', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'read_sheet',
      description: 'Read rows from a Google Sheet range. Returns JSON array of arrays.',
      inputSchema: {
        type: 'object',
        properties: {
          spreadsheetId: {
            type: 'string',
            description: 'Sheet ID from the URL: /spreadsheets/d/<ID>/',
          },
          range: {
            type: 'string',
            description: 'Cell range, e.g. "Sheet1!A1:Z" or just "Sheet1"',
          },
        },
        required: ['spreadsheetId', 'range'],
      },
    },
    {
      name: 'list_sheets',
      description: 'List all tabs/sheets within a Google Spreadsheet.',
      inputSchema: {
        type: 'object',
        properties: {
          spreadsheetId: {
            type: 'string',
            description: 'Sheet ID from the URL: /spreadsheets/d/<ID>/',
          },
        },
        required: ['spreadsheetId'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const sheets = google.sheets({ version: 'v4', auth });

  if (name === 'read_sheet') {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: args.spreadsheetId,
      range: args.range,
    });
    const rows = res.data.values ?? [];
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  }

  if (name === 'list_sheets') {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: args.spreadsheetId,
      fields: 'sheets.properties.title',
    });
    const titles = res.data.sheets?.map((s) => s.properties?.title) ?? [];
    return { content: [{ type: 'text', text: JSON.stringify(titles, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
