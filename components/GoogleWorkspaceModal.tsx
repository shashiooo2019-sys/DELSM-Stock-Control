'use client';

import React, { useState, useEffect } from 'react';
import { 
  signInWithGoogleWorkspace, 
  signOutGoogleWorkspace, 
  getCachedAccessToken,
  createGoogleSpreadsheet,
  readGoogleSpreadsheetValues,
  listGoogleDriveFiles,
  uploadToGoogleDrive,
  deleteGoogleDriveFile,
  DriveFile
} from '@/lib/googleWorkspace';
import { StockMaster, DatabaseState } from '@/lib/db';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbData: DatabaseState;
  onUpdateStockMaster?: (updatedMaster: StockMaster[]) => void;
}

export default function GoogleWorkspaceModal({
  isOpen,
  onClose,
  dbData,
  onUpdateStockMaster
}: GoogleWorkspaceModalProps) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [activeTab, setActiveTab] = useState<'sheets' | 'drive' | 'import'>('sheets');

  // Sheets export states
  const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(null);

  // Drive files state
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveSearch, setDriveSearch] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'sheets' | 'json'>('all');

  // Import from Sheets state
  const [sheetIdInput, setSheetIdInput] = useState<string>('');
  const [sheetRangeInput, setSheetRangeInput] = useState<string>('Sheet1!A1:Z100');
  const [importedPreview, setImportedPreview] = useState<any[] | null>(null);

  // Destructive confirmation modal state
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveFile | null>(null);

  const fetchDriveFiles = async (accessToken: string) => {
    try {
      const mime = fileTypeFilter === 'sheets' 
        ? 'application/vnd.google-apps.spreadsheet'
        : undefined;
      const files = await listGoogleDriveFiles(accessToken, { 
        mimeType: mime, 
        searchName: driveSearch || undefined,
        maxResults: 30
      });
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Failed to load drive files:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const currentToken = getCachedAccessToken();
      if (currentToken) {
        setTimeout(() => {
          setToken(currentToken);
          fetchDriveFiles(currentToken);
        }, 0);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    setStatusMessage({ text: 'Connecting to Google Workspace...', type: 'info' });
    try {
      const res = await signInWithGoogleWorkspace();
      setUser(res.user);
      setToken(res.accessToken);
      setStatusMessage({ text: `Successfully connected as ${res.user.email || 'Google User'}!`, type: 'success' });
      fetchDriveFiles(res.accessToken);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setStatusMessage({ text: err.message || 'Google Sign-In failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogleWorkspace();
      setUser(null);
      setToken(null);
      setDriveFiles([]);
      setStatusMessage({ text: 'Signed out of Google Workspace.', type: 'info' });
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Export Stock Master to Google Sheets
  const handleExportStockMasterToSheets = async () => {
    if (!token) {
      setStatusMessage({ text: 'Please sign in with Google first.', type: 'error' });
      return;
    }
    setLoading(true);
    setExportSuccessUrl(null);
    setStatusMessage({ text: 'Creating Google Sheet for Stock Master...', type: 'info' });

    try {
      const headers = [
        'Article Number', 'Barcode', 'Description', 'Location',
        'Smallest Unit', 'Units per Box', 'Boxes per Pack', 'Channel',
        'Total Stock Qty', 'Min Qty', 'Reorder Level', 'Max Qty',
        'Est. Monthly Usage', 'Lead Time (Days)', 'Order Volume'
      ];

      const rows = dbData.stockMaster.map(item => [
        item.article_number || '',
        item.barcode || '',
        item.description || '',
        item.location || '',
        item.smallest_unit_name || 'Piece',
        item.units_per_box ?? 1,
        item.boxes_per_pack ?? 1,
        item.ordering_channel || 'Local',
        item.total_stock_quantity ?? 0,
        item.min_quantity ?? 0,
        item.reorder_level ?? 0,
        item.max_quantity ?? 0,
        item.estimated_monthly_usage ?? 0,
        item.lead_time_days ?? 5,
        item.order_volume ?? 10
      ]);

      const title = `Delhi Station Stock Master - ${new Date().toLocaleDateString('en-GB')}`;
      const res = await createGoogleSpreadsheet(title, 'Stock Master', headers, rows, token);
      setExportSuccessUrl(res.spreadsheetUrl);
      setStatusMessage({ text: 'Stock Master successfully exported to Google Sheets!', type: 'success' });
      fetchDriveFiles(token);
    } catch (err: any) {
      console.error('Export Stock Master error:', err);
      setStatusMessage({ text: err.message || 'Failed to export to Google Sheets', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Export Purchase Orders to Google Sheets
  const handleExportPurchaseOrdersToSheets = async () => {
    if (!token) {
      setStatusMessage({ text: 'Please sign in with Google first.', type: 'error' });
      return;
    }
    setLoading(true);
    setExportSuccessUrl(null);
    setStatusMessage({ text: 'Creating Google Sheet for Purchase Orders...', type: 'info' });

    try {
      const headers = [
        'PO Number', 'Article Number', 'Description', 'Order Qty (Units)',
        'Status', 'Lead Time (Days)', 'Order Date', 'Expected Delivery',
        'Receive Date', 'Ordering Channel'
      ];

      const rows = dbData.purchaseOrders.map(po => [
        po.po_number || '',
        po.article_number || '',
        po.description || '',
        po.order_quantity_units ?? 0,
        po.status || '',
        po.lead_time_days ?? 0,
        po.order_date || '',
        po.expected_delivery_date || '',
        po.receive_date || '',
        po.ordering_channel || ''
      ]);

      const title = `Delhi Station Purchase Orders - ${new Date().toLocaleDateString('en-GB')}`;
      const res = await createGoogleSpreadsheet(title, 'Purchase Orders', headers, rows, token);
      setExportSuccessUrl(res.spreadsheetUrl);
      setStatusMessage({ text: 'Purchase Orders successfully exported to Google Sheets!', type: 'success' });
      fetchDriveFiles(token);
    } catch (err: any) {
      console.error('Export PO error:', err);
      setStatusMessage({ text: err.message || 'Failed to export Purchase Orders to Google Sheets', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Export Audit Logs to Google Sheets
  const handleExportLogsToSheets = async () => {
    if (!token) {
      setStatusMessage({ text: 'Please sign in with Google first.', type: 'error' });
      return;
    }
    setLoading(true);
    setExportSuccessUrl(null);
    setStatusMessage({ text: 'Creating Google Sheet for Stock Taking Logs...', type: 'info' });

    try {
      const headers = [
        'Log ID', 'Timestamp', 'Article Number', 'Description',
        'Audit Total Units', 'Packs', 'Boxes', 'Units', 'User', 'Details'
      ];

      const rows = dbData.stockTakingLog.map(log => [
        log.log_id || '',
        log.timestamp || '',
        log.article_number || '',
        log.description || '',
        log.quantity_counted || 0,
        log.packs ?? 0,
        log.boxes ?? 0,
        log.units ?? 0,
        log.counted_by || '',
        log.quantity_details || ''
      ]);

      const title = `Delhi Station Stock Audit Logs - ${new Date().toLocaleDateString('en-GB')}`;
      const res = await createGoogleSpreadsheet(title, 'Stock Audit Logs', headers, rows, token);
      setExportSuccessUrl(res.spreadsheetUrl);
      setStatusMessage({ text: 'Stock Audit Logs successfully exported to Google Sheets!', type: 'success' });
      fetchDriveFiles(token);
    } catch (err: any) {
      console.error('Export logs error:', err);
      setStatusMessage({ text: err.message || 'Failed to export Stock Audit Logs to Google Sheets', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Backup Full Inventory DB JSON to Google Drive
  const handleBackupToGoogleDrive = async () => {
    if (!token) {
      setStatusMessage({ text: 'Please sign in with Google first.', type: 'error' });
      return;
    }
    setLoading(true);
    setStatusMessage({ text: 'Uploading inventory backup to Google Drive...', type: 'info' });

    try {
      const fileName = `Delhi_Station_Inventory_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      const content = JSON.stringify(dbData, null, 2);
      const res = await uploadToGoogleDrive(fileName, content, 'application/json', token);
      setStatusMessage({ text: `Backup file "${res.name}" successfully created on Google Drive!`, type: 'success' });
      fetchDriveFiles(token);
    } catch (err: any) {
      console.error('Backup error:', err);
      setStatusMessage({ text: err.message || 'Failed to backup to Google Drive', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Read & Import stock from Google Sheet
  const handleReadGoogleSheet = async () => {
    if (!token) {
      setStatusMessage({ text: 'Please sign in with Google first.', type: 'error' });
      return;
    }
    if (!sheetIdInput.trim()) {
      setStatusMessage({ text: 'Please enter a valid Google Spreadsheet ID.', type: 'error' });
      return;
    }

    setLoading(true);
    setStatusMessage({ text: 'Fetching rows from Google Sheet...', type: 'info' });

    try {
      let cleanId = sheetIdInput.trim();
      // Extract ID if full URL pasted
      if (cleanId.includes('/d/')) {
        const parts = cleanId.split('/d/')[1];
        cleanId = parts.split('/')[0];
      }

      const rows = await readGoogleSpreadsheetValues(cleanId, sheetRangeInput || 'Sheet1!A1:Z100', token);
      if (rows.length < 2) {
        setStatusMessage({ text: 'The selected sheet appears to be empty or has no data rows.', type: 'error' });
        setImportedPreview(null);
        return;
      }

      const headers = rows[0].map(h => String(h).trim().toLowerCase());
      const dataRows = rows.slice(1);

      const parsedMaster: StockMaster[] = dataRows.map((r, idx) => {
        const getCol = (names: string[]) => {
          const colIndex = headers.findIndex(h => names.some(n => h.includes(n)));
          return colIndex !== -1 ? r[colIndex] : undefined;
        };

        const artNum = getCol(['article', 'item', 'code']) || `ART-GS-${idx + 1}`;
        const desc = getCol(['description', 'name', 'title']) || `Imported Item ${idx + 1}`;
        const loc = getCol(['location', 'shelf', 'bin']) || 'Central Depot';
        const unitName = getCol(['unit', 'smallest']) || 'Piece';

        return {
          article_number: String(artNum).trim(),
          barcode: String(getCol(['barcode', 'upc']) || artNum).trim(),
          description: String(desc).trim(),
          location: String(loc).trim(),
          smallest_unit_name: String(unitName).trim(),
          units_per_box: Number(getCol(['units per box', 'box qty'])) || 1,
          boxes_per_pack: Number(getCol(['boxes per pack', 'pack qty'])) || 1,
          ordering_channel: (getCol(['channel']) as any) || 'Local',
          total_stock_quantity: Number(getCol(['total', 'stock', 'qty'])) || 0,
          min_quantity: Number(getCol(['min'])) || 0,
          reorder_level: Number(getCol(['reorder'])) || 0,
          max_quantity: Number(getCol(['max'])) || 100,
          estimated_monthly_usage: Number(getCol(['usage', 'monthly'])) || 0,
          lead_time_days: Number(getCol(['lead'])) || 5,
          order_volume: Number(getCol(['order volume', 'volume'])) || 10,
        };
      });

      setImportedPreview(parsedMaster);
      setStatusMessage({ text: `Successfully read ${parsedMaster.length} stock items from Google Sheet. Review and confirm below.`, type: 'success' });
    } catch (err: any) {
      console.error('Read Google Sheet error:', err);
      setStatusMessage({ text: err.message || 'Failed to read Google Sheet', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyImport = () => {
    if (!importedPreview || !onUpdateStockMaster) return;
    
    // Merge or replace
    const mergedMap = new Map<string, StockMaster>();
    dbData.stockMaster.forEach(item => mergedMap.set(item.article_number, item));
    importedPreview.forEach(item => mergedMap.set(item.article_number, item));

    const updated = Array.from(mergedMap.values());
    onUpdateStockMaster(updated);
    setStatusMessage({ text: `Successfully imported and merged ${importedPreview.length} articles into Stock Master!`, type: 'success' });
    setImportedPreview(null);
  };

  // Perform file deletion with user confirmation
  const handleConfirmDelete = async () => {
    if (!confirmDeleteFile || !token) return;
    setLoading(true);
    try {
      await deleteGoogleDriveFile(confirmDeleteFile.id, token);
      setStatusMessage({ text: `Deleted "${confirmDeleteFile.name}" from Google Drive.`, type: 'success' });
      setConfirmDeleteFile(null);
      fetchDriveFiles(token);
    } catch (err: any) {
      console.error('Delete Drive file error:', err);
      setStatusMessage({ text: err.message || 'Failed to delete file from Google Drive', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center p-2 backdrop-blur-md">
              <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Google Workspace Integration</h2>
              <p className="text-xs text-slate-300">Sync with Google Sheets & Google Drive seamlessly</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Auth Banner & Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {!token ? (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-600">Connect Google Account to enable live sync:</span>
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="gsi-material-button inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 text-slate-700 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-800">
                  Connected to Google Workspace
                </span>
                {user?.email && (
                  <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded font-mono">
                    {user.email}
                  </span>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium underline"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className={`px-6 py-2.5 text-xs font-medium border-b flex items-center justify-between ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
            'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
        )}

        {/* Tabs Header */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'sheets'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📊 Export to Google Sheets
          </button>
          <button
            onClick={() => setActiveTab('drive')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'drive'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📁 Google Drive Files & Backups
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📥 Import from Google Sheets
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: SHEETS EXPORT */}
          {activeTab === 'sheets' && (
            <div className="space-y-6">
              <p className="text-xs text-slate-600 leading-relaxed">
                Export real-time inventory records, purchase orders, or stock audit logs directly to a formatted Google Spreadsheet on your Google Drive.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-2">📦</div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">Stock Master Catalog</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Export all {dbData.stockMaster.length} articles with complete packaging, location, reorder triggers, and current quantities.
                    </p>
                  </div>
                  <button
                    onClick={handleExportStockMasterToSheets}
                    disabled={loading || !token}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    Export Stock Master
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-2">📋</div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">Purchase Orders</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Export all {dbData.purchaseOrders.length} active and historic POs with statuses and delivery schedules.
                    </p>
                  </div>
                  <button
                    onClick={handleExportPurchaseOrdersToSheets}
                    disabled={loading || !token}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    Export Purchase Orders
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-2">🔍</div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">Stock Audit Logs</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Export all {dbData.stockTakingLog.length} stock check log entries with breakdown of packs, boxes, and units.
                    </p>
                  </div>
                  <button
                    onClick={handleExportLogsToSheets}
                    disabled={loading || !token}
                    className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                  >
                    Export Stock Logs
                  </button>
                </div>
              </div>

              {exportSuccessUrl && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                    <span>✅ Sheet created successfully!</span>
                  </div>
                  <a
                    href={exportSuccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                  >
                    Open Google Sheet ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DRIVE FILES & BACKUPS */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Cloud Storage & Backups</h3>
                  <p className="text-xs text-slate-500">Save complete database backups directly to your Google Drive.</p>
                </div>
                <button
                  onClick={handleBackupToGoogleDrive}
                  disabled={loading || !token}
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  ☁️ Backup Database to Drive
                </button>
              </div>

              {/* Drive File Search & Filter */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search files in Google Drive..."
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={() => token && fetchDriveFiles(token)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
                  >
                    Search
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={fileTypeFilter}
                    onChange={(e: any) => {
                      setFileTypeFilter(e.target.value);
                      if (token) fetchDriveFiles(token);
                    }}
                    className="text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white"
                  >
                    <option value="all">All Files</option>
                    <option value="sheets">Google Spreadsheets</option>
                  </select>
                </div>
              </div>

              {/* Drive Files List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200 flex justify-between">
                  <span>File Name</span>
                  <span>Actions</span>
                </div>
                {driveFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    {token ? 'No matching files found in Google Drive.' : 'Sign in with Google to view your Drive files.'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto text-xs">
                    {driveFiles.map((f) => (
                      <div key={f.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <span>{f.mimeType.includes('spreadsheet') ? '📊' : '📄'}</span>
                          <span className="font-medium text-slate-800 truncate" title={f.name}>
                            {f.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {f.webViewLink && (
                            <a
                              href={f.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-700 font-semibold text-xs"
                            >
                              Open ↗
                            </a>
                          )}
                          <button
                            onClick={() => {
                              if (f.mimeType.includes('spreadsheet')) {
                                setSheetIdInput(f.id);
                                setActiveTab('import');
                              }
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                          >
                            Use for Import
                          </button>
                          <button
                            onClick={() => setConfirmDeleteFile(f)}
                            className="text-rose-600 hover:text-rose-700 font-semibold text-xs ml-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT FROM SHEETS */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <p className="text-xs text-slate-600">
                Import or update Stock Master inventory records directly from any Google Spreadsheet on your Drive.
              </p>

              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Spreadsheet ID or URL:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1BxiMVs0XRnt3kgjZptb81SSFOhP564... or paste full Google Sheet link"
                    value={sheetIdInput}
                    onChange={(e) => setSheetIdInput(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sheet Name & Range:
                  </label>
                  <input
                    type="text"
                    placeholder="Sheet1!A1:Z100"
                    value={sheetRangeInput}
                    onChange={(e) => setSheetRangeInput(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white font-mono"
                  />
                </div>

                <button
                  onClick={handleReadGoogleSheet}
                  disabled={loading || !token}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  Fetch Data from Google Sheet
                </button>
              </div>

              {importedPreview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">
                      Import Preview ({importedPreview.length} Items Found)
                    </h3>
                    <button
                      onClick={handleApplyImport}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                    >
                      Confirm & Merge into Stock Master
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-56 text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0">
                        <tr>
                          <th className="p-2">Article #</th>
                          <th className="p-2">Description</th>
                          <th className="p-2">Location</th>
                          <th className="p-2">Stock Qty</th>
                          <th className="p-2">Channel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {importedPreview.slice(0, 10).map((p, i) => (
                          <tr key={i}>
                            <td className="p-2 font-bold text-slate-800">{p.article_number}</td>
                            <td className="p-2 text-slate-700">{p.description}</td>
                            <td className="p-2 text-slate-600">{p.location}</td>
                            <td className="p-2 font-bold text-indigo-600">{p.total_stock_quantity}</td>
                            <td className="p-2 text-slate-500">{p.ordering_channel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importedPreview.length > 10 && (
                    <p className="text-[11px] text-slate-400 italic">Showing first 10 rows...</p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* Explicit User Confirmation Dialog for Destructive Operations (Drive Delete) */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete File from Google Drive?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{confirmDeleteFile.name}</strong> from your Google Drive? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteFile(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
