import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Listen to auth state to clear token if signed out
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    if (!user && !isSigningIn) {
      cachedAccessToken = null;
    }
  });
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export async function signInWithGoogleWorkspace(): Promise<{ user: User; accessToken: string }> {
  isSigningIn = true;
  try {
    const provider = new GoogleAuthProvider();
    WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
    // Prompt account selection
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error('Could not obtain Google OAuth access token.');
    }

    cachedAccessToken = accessToken;
    return { user: result.user, accessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function signOutGoogleWorkspace() {
  cachedAccessToken = null;
  await signOut(auth);
}

// ==========================================
// GOOGLE SHEETS API V4 HELPERS
// ==========================================

export interface CreateSheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a new Google Spreadsheet with specified headers and rows
 */
export async function createGoogleSpreadsheet(
  title: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  accessToken: string
): Promise<CreateSheetResponse> {
  const body = {
    properties: { title },
    sheets: [
      {
        properties: { title: sheetName },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: headers.map(h => ({
                  userEnteredValue: { stringValue: String(h) },
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.9, green: 0.93, blue: 0.98 }
                  }
                }))
              },
              ...rows.map(row => ({
                values: row.map(val => {
                  if (typeof val === 'number') {
                    return { userEnteredValue: { numberValue: val } };
                  }
                  return { userEnteredValue: { stringValue: String(val ?? '') } };
                })
              }))
            ]
          }
        ]
      }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to create Google Spreadsheet');
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`
  };
}

/**
 * Appends rows to an existing Google Spreadsheet
 */
export async function appendToGoogleSpreadsheet(
  spreadsheetId: string,
  range: string,
  values: (string | number)[][],
  accessToken: string
) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to append data to Google Spreadsheet');
  }

  return await response.json();
}

/**
 * Reads values from a Google Spreadsheet range
 */
export async function readGoogleSpreadsheetValues(
  spreadsheetId: string,
  range: string,
  accessToken: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to read Google Spreadsheet values');
  }

  const data = await response.json();
  return data.values || [];
}

// ==========================================
// GOOGLE DRIVE API V3 HELPERS
// ==========================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
}

/**
 * Lists files from Google Drive
 */
export async function listGoogleDriveFiles(
  accessToken: string,
  options?: { mimeType?: string; searchName?: string; maxResults?: number }
): Promise<DriveFile[]> {
  const clauses: string[] = ['trashed = false'];

  if (options?.mimeType) {
    clauses.push(`mimeType = '${options.mimeType}'`);
  }
  if (options?.searchName) {
    clauses.push(`name contains '${options.searchName.replace(/'/g, "\\'")}'`);
  }

  const q = clauses.join(' and ');
  const pageSize = options?.maxResults || 20;
  const fields = 'files(id, name, mimeType, webViewLink, createdTime, modifiedTime, size)';

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to fetch files from Google Drive');
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Uploads text/JSON or CSV backup content directly to Google Drive
 */
export async function uploadToGoogleDrive(
  fileName: string,
  content: string,
  mimeType: string,
  accessToken: string
): Promise<DriveFile> {
  const metadata = {
    name: fileName,
    mimeType: mimeType
  };

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + mimeType + '\r\n\r\n' +
    content +
    close_delim;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to upload file to Google Drive');
  }

  return await response.json();
}

/**
 * Deletes a file from Google Drive (Requires explicit user confirmation)
 */
export async function deleteGoogleDriveFile(fileId: string, accessToken: string) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete file from Google Drive');
  }

  return true;
}
