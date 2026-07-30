'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  TableProperties,
  AlertCircle,
  Save,
  RefreshCw,
  MapPin,
  Truck,
  CheckCircle2,
  RotateCcw,
  Zap,
  LogOut,
  ArrowLeft,
  X,
  Pin,
  MoveHorizontal,
  Columns
} from 'lucide-react';
import { StockMaster } from '@/lib/db';

interface ExcelStockGridProps {
  filteredArticles: StockMaster[];
  selectedArticleNumbers: string[];
  setSelectedArticleNumbers: (nums: string[]) => void;
  gridEdits: Record<string, Partial<StockMaster>>;
  setGridEdits: React.Dispatch<React.SetStateAction<Record<string, Partial<StockMaster>>>>;
  gridAutoSave: boolean;
  setGridAutoSave: (val: boolean) => void;
  gridSavedToast: string | null;
  setGridSavedToast: (val: string | null) => void;
  gridSaveError: string | null;
  setGridSaveError: (val: string | null) => void;
  isBatchSavingGrid: boolean;
  batchLocationInput: string;
  setBatchLocationInput: (val: string) => void;
  uniqueLocations: string[];
  handleGridCellChange: (articleNum: string, field: keyof StockMaster, value: any, autoSave?: boolean) => void;
  handleSaveGridRow: (article: StockMaster) => Promise<void>;
  handleSaveAllGridEdits: () => Promise<void>;
  handleDiscardGridRow: (articleNum: string) => void;
  handleDiscardAllGridEdits: () => void;
  handleBulkApplyLocation: (loc: string) => void;
  onExitGridMode?: () => void;
}

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  checkbox: 44,
  article_number: 130,
  description: 260,
  location: 130,
  currentStock: 145,
  min_quantity: 95,
  reorder_level: 105,
  max_quantity: 95,
  estimated_monthly_usage: 115,
  barcode: 130,
  ordering_channel: 130,
  lead_time_days: 90,
  boxes_per_pack: 90,
  units_per_box: 90,
  smallest_unit_name: 105,
  quantity_details: 200,
  add_info: 180,
  actions: 100,
};

export function ExcelStockGrid({
  filteredArticles,
  selectedArticleNumbers,
  setSelectedArticleNumbers,
  gridEdits,
  setGridEdits,
  gridAutoSave,
  setGridAutoSave,
  gridSavedToast,
  setGridSavedToast,
  gridSaveError,
  setGridSaveError,
  isBatchSavingGrid,
  batchLocationInput,
  setBatchLocationInput,
  uniqueLocations,
  handleGridCellChange,
  handleSaveGridRow,
  handleSaveAllGridEdits,
  handleDiscardGridRow,
  handleDiscardAllGridEdits,
  handleBulkApplyLocation,
  onExitGridMode
}: ExcelStockGridProps) {
  // Column Widths State with LocalStorage Persistence
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('excel_grid_col_widths');
        if (saved) {
          return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  // Freeze Pane for Item Description Toggle
  const [freezeDescription, setFreezeDescription] = useState<boolean>(true);
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  // Column Resizing Handler
  const handleResizeStart = (colKey: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 100;
    setResizingCol(colKey);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const deltaX = currentX - clientX;
      const newWidth = Math.max(40, startWidth + deltaX);
      setColumnWidths((prev) => {
        const updated = { ...prev, [colKey]: newWidth };
        try {
          localStorage.setItem('excel_grid_col_widths', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });
    };

    const handleEnd = () => {
      setResizingCol(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  };

  const handleResetWidths = () => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    try {
      localStorage.removeItem('excel_grid_col_widths');
    } catch (err) {}
  };

  // Calculate Sticky Frozen Offsets
  const checkboxWidth = columnWidths.checkbox || 44;
  const articleWidth = columnWidths.article_number || 130;
  const descWidth = columnWidths.description || 260;

  const articleLeft = freezeDescription ? checkboxWidth : 0;
  const descLeft = freezeDescription ? checkboxWidth + articleWidth : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col my-4">
      {/* Grid Header Toolbar */}
      <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
              Excel Quick Grid Edit
              <span className="bg-emerald-500 text-slate-950 font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                Live Inline Sync
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              Drag column borders to resize. Freeze pane keeps Item Description visible when scrolling right.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Freeze Pane Toggle */}
          <button
            onClick={() => setFreezeDescription(!freezeDescription)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer select-none ${
              freezeDescription
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Frozen Pane for Item Description & Article #"
          >
            <Pin className={`w-3.5 h-3.5 ${freezeDescription ? 'rotate-45 text-amber-300' : ''}`} />
            <span>{freezeDescription ? 'Pane Frozen: Description' : 'Freeze Description Pane'}</span>
          </button>

          {/* Reset Column Sizes */}
          <button
            onClick={handleResetWidths}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
            title="Reset all column widths to defaults"
          >
            <Columns className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Column Sizes</span>
          </button>

          {/* Unsaved Edits Badge */}
          {Object.keys(gridEdits).length > 0 && (
            <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>{Object.keys(gridEdits).length} Row(s) Modified</span>
            </div>
          )}

          {/* Save All Button */}
          <button
            onClick={handleSaveAllGridEdits}
            disabled={Object.keys(gridEdits).length === 0 || isBatchSavingGrid}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition cursor-pointer ${
              Object.keys(gridEdits).length > 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-300'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
            title="Save all modified cells to database and sync with Firebase Firestore"
          >
            {isBatchSavingGrid ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Save className="w-4 h-4 text-slate-950" />
            )}
            <span>{isBatchSavingGrid ? 'Saving...' : `Save All Changes (${Object.keys(gridEdits).length})`}</span>
          </button>

          {/* Discard All Button */}
          {Object.keys(gridEdits).length > 0 && (
            <button
              onClick={handleDiscardAllGridEdits}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Discard all pending grid edits"
            >
              Discard
            </button>
          )}

          {/* Auto-Save Toggle */}
          <label className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={gridAutoSave}
              onChange={(e) => setGridAutoSave(e.target.checked)}
              className="accent-emerald-500 rounded cursor-pointer"
            />
            <span className="font-medium">Auto-Sync on Change/Leave</span>
          </label>

          {/* Exit Grid Mode Button */}
          {onExitGridMode && (
            <button
              onClick={onExitGridMode}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              title="Exit Excel Grid Mode and return to Standard View"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Grid Mode</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Alerts for Grid Actions */}
      {gridSavedToast && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{gridSavedToast}</span>
          </div>
          <button onClick={() => setGridSavedToast(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {gridSaveError && (
        <div className="bg-red-50 border-b border-red-200 text-red-900 px-4 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{gridSaveError}</span>
          </div>
          <button onClick={() => setGridSaveError(null)} className="text-red-700 hover:text-red-900 font-bold">✕</button>
        </div>
      )}

      {/* Batch Operations Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-semibold">
          <span>Quick Excel Tools:</span>
          <span className="text-slate-400 font-normal">
            Showing {filteredArticles.length} items • Hover column header edge and drag <MoveHorizontal className="w-3 h-3 inline text-slate-400" /> to resize
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk Set Location */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-indigo-500 ml-1" />
            <input
              type="text"
              list="grid-locations-list"
              placeholder="Bulk Location (e.g. WH-B2)..."
              value={batchLocationInput}
              onChange={(e) => setBatchLocationInput(e.target.value)}
              className="px-2 py-1 text-xs w-44 outline-none font-mono"
            />
            <datalist id="grid-locations-list">
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
            <button
              onClick={() => handleBulkApplyLocation(batchLocationInput)}
              disabled={!batchLocationInput.trim()}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded font-bold text-[11px] transition cursor-pointer"
            >
              Apply Location to {selectedArticleNumbers.length > 0 ? `${selectedArticleNumbers.length} Selected` : 'All Filtered'}
            </button>
          </div>

          {/* Quick Route Toggle */}
          <button
            onClick={() => {
              const targetNums = selectedArticleNumbers.length > 0 ? selectedArticleNumbers : filteredArticles.map(a => a.article_number);
              const updatedEdits = { ...gridEdits };
              targetNums.forEach(num => {
                updatedEdits[num] = { ...(updatedEdits[num] || {}), ordering_channel: 'Central' };
              });
              setGridEdits(updatedEdits);
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" /> Set Central Route
          </button>

          <button
            onClick={() => {
              const targetNums = selectedArticleNumbers.length > 0 ? selectedArticleNumbers : filteredArticles.map(a => a.article_number);
              const updatedEdits = { ...gridEdits };
              targetNums.forEach(num => {
                updatedEdits[num] = { ...(updatedEdits[num] || {}), ordering_channel: 'Local' };
              });
              setGridEdits(updatedEdits);
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-slate-600" /> Set Local Route
          </button>
        </div>
      </div>

      {/* High Density Editable Excel Grid with Resizable Columns & Freeze Pane */}
      <div className="overflow-x-auto max-h-[70vh] relative select-none">
        <table className="w-full text-left border-collapse border-spacing-0 table-fixed">
          <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold border-b border-slate-300 shadow-2xs">
            <tr>
              {/* Checkbox Column */}
              <th
                className={`p-2 border-r border-slate-200 text-center bg-slate-100 relative group ${
                  freezeDescription ? 'sticky top-0 left-0 z-40 bg-slate-100' : ''
                }`}
                style={{ width: checkboxWidth, minWidth: checkboxWidth, maxWidth: checkboxWidth }}
              >
                <input
                  type="checkbox"
                  checked={selectedArticleNumbers.length > 0 && selectedArticleNumbers.length === filteredArticles.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedArticleNumbers(filteredArticles.map(a => a.article_number));
                    } else {
                      setSelectedArticleNumbers([]);
                    }
                  }}
                />
                <div
                  onMouseDown={(e) => handleResizeStart('checkbox', e)}
                  onTouchStart={(e) => handleResizeStart('checkbox', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Article # Column */}
              <th
                className={`p-2.5 border-r border-slate-200 bg-slate-100 relative group ${
                  freezeDescription ? 'sticky top-0 z-40 bg-slate-100' : ''
                }`}
                style={{
                  left: freezeDescription ? articleLeft : undefined,
                  width: articleWidth,
                  minWidth: articleWidth,
                  maxWidth: articleWidth
                }}
              >
                <div className="flex items-center justify-between pr-1">
                  <span className="truncate">Article #</span>
                </div>
                <div
                  onMouseDown={(e) => handleResizeStart('article_number', e)}
                  onTouchStart={(e) => handleResizeStart('article_number', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Description Column (Frozen Pane Edge) */}
              <th
                className={`p-2.5 bg-slate-100 relative group ${
                  freezeDescription
                    ? 'sticky top-0 z-40 bg-slate-100 border-r-2 border-r-slate-400 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]'
                    : 'border-r border-slate-200'
                }`}
                style={{
                  left: freezeDescription ? descLeft : undefined,
                  width: descWidth,
                  minWidth: descWidth,
                  maxWidth: descWidth
                }}
              >
                <div className="flex items-center justify-between gap-1 pr-1">
                  <span className="truncate">Description</span>
                  {freezeDescription && <Pin className="w-3 h-3 text-indigo-600 rotate-45 shrink-0" title="Frozen Pane" />}
                </div>
                <div
                  onMouseDown={(e) => handleResizeStart('description', e)}
                  onTouchStart={(e) => handleResizeStart('description', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Location Column */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.location, minWidth: columnWidths.location, maxWidth: columnWidths.location }}
              >
                <span className="truncate">Location</span>
                <div
                  onMouseDown={(e) => handleResizeStart('location', e)}
                  onTouchStart={(e) => handleResizeStart('location', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Current Stock */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.currentStock, minWidth: columnWidths.currentStock, maxWidth: columnWidths.currentStock }}
              >
                <span className="truncate">Current Stock</span>
                <div
                  onMouseDown={(e) => handleResizeStart('currentStock', e)}
                  onTouchStart={(e) => handleResizeStart('currentStock', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Min Qty */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.min_quantity, minWidth: columnWidths.min_quantity, maxWidth: columnWidths.min_quantity }}
              >
                <span className="truncate">Min Qty</span>
                <div
                  onMouseDown={(e) => handleResizeStart('min_quantity', e)}
                  onTouchStart={(e) => handleResizeStart('min_quantity', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Reorder Level */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.reorder_level, minWidth: columnWidths.reorder_level, maxWidth: columnWidths.reorder_level }}
              >
                <span className="truncate">Reorder Level</span>
                <div
                  onMouseDown={(e) => handleResizeStart('reorder_level', e)}
                  onTouchStart={(e) => handleResizeStart('reorder_level', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Max Qty */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.max_quantity, minWidth: columnWidths.max_quantity, maxWidth: columnWidths.max_quantity }}
              >
                <span className="truncate">Max Qty</span>
                <div
                  onMouseDown={(e) => handleResizeStart('max_quantity', e)}
                  onTouchStart={(e) => handleResizeStart('max_quantity', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Monthly Usage */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.estimated_monthly_usage, minWidth: columnWidths.estimated_monthly_usage, maxWidth: columnWidths.estimated_monthly_usage }}
              >
                <span className="truncate">Monthly Usage</span>
                <div
                  onMouseDown={(e) => handleResizeStart('estimated_monthly_usage', e)}
                  onTouchStart={(e) => handleResizeStart('estimated_monthly_usage', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Barcode */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.barcode, minWidth: columnWidths.barcode, maxWidth: columnWidths.barcode }}
              >
                <span className="truncate">Barcode</span>
                <div
                  onMouseDown={(e) => handleResizeStart('barcode', e)}
                  onTouchStart={(e) => handleResizeStart('barcode', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Route */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.ordering_channel, minWidth: columnWidths.ordering_channel, maxWidth: columnWidths.ordering_channel }}
              >
                <span className="truncate">Route</span>
                <div
                  onMouseDown={(e) => handleResizeStart('ordering_channel', e)}
                  onTouchStart={(e) => handleResizeStart('ordering_channel', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Lead Days */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.lead_time_days, minWidth: columnWidths.lead_time_days, maxWidth: columnWidths.lead_time_days }}
              >
                <span className="truncate">Lead Days</span>
                <div
                  onMouseDown={(e) => handleResizeStart('lead_time_days', e)}
                  onTouchStart={(e) => handleResizeStart('lead_time_days', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Boxes/Pack */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.boxes_per_pack, minWidth: columnWidths.boxes_per_pack, maxWidth: columnWidths.boxes_per_pack }}
              >
                <span className="truncate">Boxes/Pack</span>
                <div
                  onMouseDown={(e) => handleResizeStart('boxes_per_pack', e)}
                  onTouchStart={(e) => handleResizeStart('boxes_per_pack', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Units/Box */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.units_per_box, minWidth: columnWidths.units_per_box, maxWidth: columnWidths.units_per_box }}
              >
                <span className="truncate">Units/Box</span>
                <div
                  onMouseDown={(e) => handleResizeStart('units_per_box', e)}
                  onTouchStart={(e) => handleResizeStart('units_per_box', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Unit Name */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.smallest_unit_name, minWidth: columnWidths.smallest_unit_name, maxWidth: columnWidths.smallest_unit_name }}
              >
                <span className="truncate">Unit Name</span>
                <div
                  onMouseDown={(e) => handleResizeStart('smallest_unit_name', e)}
                  onTouchStart={(e) => handleResizeStart('smallest_unit_name', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Quantity Details */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.quantity_details, minWidth: columnWidths.quantity_details, maxWidth: columnWidths.quantity_details }}
              >
                <span className="truncate">Quantity Details</span>
                <div
                  onMouseDown={(e) => handleResizeStart('quantity_details', e)}
                  onTouchStart={(e) => handleResizeStart('quantity_details', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Remarks */}
              <th
                className="p-2.5 border-r border-slate-200 bg-slate-100 relative group"
                style={{ width: columnWidths.add_info, minWidth: columnWidths.add_info, maxWidth: columnWidths.add_info }}
              >
                <span className="truncate">Remarks / Add Info</span>
                <div
                  onMouseDown={(e) => handleResizeStart('add_info', e)}
                  onTouchStart={(e) => handleResizeStart('add_info', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>

              {/* Actions */}
              <th
                className="p-2.5 text-right bg-slate-100 relative group"
                style={{ width: columnWidths.actions, minWidth: columnWidths.actions, maxWidth: columnWidths.actions }}
              >
                <span className="truncate">Actions</span>
                <div
                  onMouseDown={(e) => handleResizeStart('actions', e)}
                  onTouchStart={(e) => handleResizeStart('actions', e)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Resize column"
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-mono">
            {filteredArticles.length === 0 ? (
              <tr>
                <td colSpan={18} className="p-8 text-center text-slate-400 font-sans">
                  No articles found matching filters.
                </td>
              </tr>
            ) : (
              filteredArticles.map((article, idx) => {
                const rowEdit = gridEdits[article.article_number] || {};
                const isModified = Object.keys(rowEdit).length > 0;

                const desc = rowEdit.description !== undefined ? rowEdit.description : article.description;
                const loc = rowEdit.location !== undefined ? rowEdit.location : article.location;
                const stock = rowEdit.currentStock !== undefined ? rowEdit.currentStock : article.currentStock;
                const minQ = rowEdit.min_quantity !== undefined ? rowEdit.min_quantity : article.min_quantity;
                const reorder = rowEdit.reorder_level !== undefined ? rowEdit.reorder_level : article.reorder_level;
                const maxQ = rowEdit.max_quantity !== undefined ? rowEdit.max_quantity : article.max_quantity;
                const monthly = rowEdit.estimated_monthly_usage !== undefined ? rowEdit.estimated_monthly_usage : article.estimated_monthly_usage;
                const code = rowEdit.barcode !== undefined ? rowEdit.barcode : article.barcode;
                const route = rowEdit.ordering_channel !== undefined ? rowEdit.ordering_channel : article.ordering_channel;
                const lead = rowEdit.lead_time_days !== undefined ? rowEdit.lead_time_days : article.lead_time_days;
                const bpp = rowEdit.boxes_per_pack !== undefined ? rowEdit.boxes_per_pack : article.boxes_per_pack;
                const upb = rowEdit.units_per_box !== undefined ? rowEdit.units_per_box : article.units_per_box;
                const unitName = rowEdit.smallest_unit_name !== undefined ? rowEdit.smallest_unit_name : article.smallest_unit_name;
                const qtySpec = rowEdit.quantity_details !== undefined ? rowEdit.quantity_details : article.quantity_details;
                const addInfo = rowEdit.add_info !== undefined ? rowEdit.add_info : article.add_info;

                const currentStockVal = Number(stock) || 0;
                const reorderVal = Number(reorder) || 0;
                const minVal = Number(minQ) || 0;
                let statusBadge = { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: '🟢 OK' };
                if (currentStockVal <= reorderVal) {
                  statusBadge = { bg: 'bg-red-100 text-red-800 border-red-300', text: '🔴 ALERT' };
                } else if (currentStockVal <= minVal * 1.2) {
                  statusBadge = { bg: 'bg-amber-100 text-amber-800 border-amber-300', text: '🟡 LOW' };
                }

                // Explicit row background for seamless frozen column rendering
                const rowBgClass = isModified
                  ? 'bg-amber-50'
                  : idx % 2 === 0
                  ? 'bg-white'
                  : 'bg-slate-50';

                return (
                  <tr
                    key={article.article_number}
                    className={`transition ${rowBgClass} hover:bg-amber-100/60`}
                  >
                    {/* Checkbox */}
                    <td
                      className={`p-2 border-r border-slate-200 text-center ${rowBgClass} ${
                        freezeDescription ? 'sticky left-0 z-20' : ''
                      }`}
                      style={{ width: checkboxWidth, minWidth: checkboxWidth, maxWidth: checkboxWidth }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedArticleNumbers.includes(article.article_number)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedArticleNumbers([...selectedArticleNumbers, article.article_number]);
                          } else {
                            setSelectedArticleNumbers(selectedArticleNumbers.filter(num => num !== article.article_number));
                          }
                        }}
                      />
                    </td>

                    {/* Article # */}
                    <td
                      className={`p-2 border-r border-slate-200 font-bold text-slate-800 select-none ${rowBgClass} ${
                        freezeDescription ? 'sticky z-20' : ''
                      }`}
                      style={{
                        left: freezeDescription ? articleLeft : undefined,
                        width: articleWidth,
                        minWidth: articleWidth,
                        maxWidth: articleWidth
                      }}
                    >
                      <div className="flex items-center gap-1 overflow-hidden">
                        <span className="truncate">{article.article_number}</span>
                        {isModified && <span className="text-[9px] bg-amber-500 text-slate-950 font-extrabold px-1 rounded shrink-0">MOD</span>}
                      </div>
                    </td>

                    {/* Description (Frozen Edge) */}
                    <td
                      className={`p-1 ${rowBgClass} ${
                        freezeDescription
                          ? 'sticky z-20 border-r-2 border-r-slate-300 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]'
                          : 'border-r border-slate-200'
                      }`}
                      style={{
                        left: freezeDescription ? descLeft : undefined,
                        width: descWidth,
                        minWidth: descWidth,
                        maxWidth: descWidth
                      }}
                    >
                      <input
                        type="text"
                        value={desc || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'description', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs font-semibold text-slate-800 outline-none transition truncate"
                      />
                    </td>

                    {/* Location */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.location, minWidth: columnWidths.location, maxWidth: columnWidths.location }}
                    >
                      <input
                        type="text"
                        list="grid-locations-list"
                        value={loc || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'location', e.target.value.toUpperCase())}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-indigo-50/50 hover:bg-indigo-50 focus:bg-white border border-indigo-100 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 font-mono text-xs font-bold text-indigo-900 outline-none transition uppercase truncate"
                        placeholder="LOCATION..."
                      />
                    </td>

                    {/* Current Stock */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.currentStock, minWidth: columnWidths.currentStock, maxWidth: columnWidths.currentStock }}
                    >
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={stock ?? 0}
                          onChange={(e) => handleGridCellChange(article.article_number, 'currentStock', e.target.value)}
                          onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                          className="w-16 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-1.5 py-1 font-mono text-xs font-bold text-slate-900 outline-none text-right transition"
                        />
                        <span className={`text-[9px] font-bold border px-1 py-0.5 rounded whitespace-nowrap shrink-0 ${statusBadge.bg}`}>
                          {statusBadge.text}
                        </span>
                      </div>
                    </td>

                    {/* Min Quantity */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.min_quantity, minWidth: columnWidths.min_quantity, maxWidth: columnWidths.min_quantity }}
                    >
                      <input
                        type="number"
                        value={minQ ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'min_quantity', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Reorder Level */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.reorder_level, minWidth: columnWidths.reorder_level, maxWidth: columnWidths.reorder_level }}
                    >
                      <input
                        type="number"
                        value={reorder ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'reorder_level', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 rounded px-2 py-1 font-mono text-xs font-bold text-red-600 outline-none text-right transition"
                      />
                    </td>

                    {/* Max Quantity */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.max_quantity, minWidth: columnWidths.max_quantity, maxWidth: columnWidths.max_quantity }}
                    >
                      <input
                        type="number"
                        value={maxQ ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'max_quantity', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Monthly Usage */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.estimated_monthly_usage, minWidth: columnWidths.estimated_monthly_usage, maxWidth: columnWidths.estimated_monthly_usage }}
                    >
                      <input
                        type="number"
                        value={monthly ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'estimated_monthly_usage', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Barcode */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.barcode, minWidth: columnWidths.barcode, maxWidth: columnWidths.barcode }}
                    >
                      <input
                        type="text"
                        value={code || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'barcode', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none transition truncate"
                      />
                    </td>

                    {/* Route */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.ordering_channel, minWidth: columnWidths.ordering_channel, maxWidth: columnWidths.ordering_channel }}
                    >
                      <select
                        value={route || 'Central'}
                        onChange={(e) => {
                          handleGridCellChange(article.article_number, 'ordering_channel', e.target.value, true);
                        }}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-1 text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="Central">Central Team</option>
                        <option value="Local">Local Purchase</option>
                      </select>
                    </td>

                    {/* Lead Days */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.lead_time_days, minWidth: columnWidths.lead_time_days, maxWidth: columnWidths.lead_time_days }}
                    >
                      <input
                        type="number"
                        value={lead ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'lead_time_days', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Boxes / Pack */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.boxes_per_pack, minWidth: columnWidths.boxes_per_pack, maxWidth: columnWidths.boxes_per_pack }}
                    >
                      <input
                        type="number"
                        value={bpp ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'boxes_per_pack', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Units / Box */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.units_per_box, minWidth: columnWidths.units_per_box, maxWidth: columnWidths.units_per_box }}
                    >
                      <input
                        type="number"
                        value={upb ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'units_per_box', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Unit Name */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.smallest_unit_name, minWidth: columnWidths.smallest_unit_name, maxWidth: columnWidths.smallest_unit_name }}
                    >
                      <input
                        type="text"
                        value={unitName || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'smallest_unit_name', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition truncate"
                      />
                    </td>

                    {/* Quantity Details */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.quantity_details, minWidth: columnWidths.quantity_details, maxWidth: columnWidths.quantity_details }}
                    >
                      <input
                        type="text"
                        value={qtySpec || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'quantity_details', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition truncate"
                        placeholder="e.g. 5 boxes x 20 rolls..."
                      />
                    </td>

                    {/* Remarks */}
                    <td
                      className="p-1 border-r border-slate-200"
                      style={{ width: columnWidths.add_info, minWidth: columnWidths.add_info, maxWidth: columnWidths.add_info }}
                    >
                      <input
                        type="text"
                        value={addInfo || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'add_info', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition truncate"
                        placeholder="e.g. Recounted on Monday..."
                      />
                    </td>

                    {/* Row Actions */}
                    <td
                      className="p-2 text-right"
                      style={{ width: columnWidths.actions, minWidth: columnWidths.actions, maxWidth: columnWidths.actions }}
                    >
                      <div className="flex justify-end gap-1">
                        {isModified ? (
                          <>
                            <button
                              onClick={() => handleSaveGridRow(article)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition shadow-2xs cursor-pointer"
                              title="Save changes for this row"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDiscardGridRow(article.article_number)}
                              className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                              title="Discard changes for this row"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic select-none">Saved</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grid Footer Bar */}
      <div className="p-3 bg-slate-900 text-slate-200 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-emerald-400 font-bold">
            Total Articles: {filteredArticles.length}
          </span>
          {Object.keys(gridEdits).length > 0 && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-bold">
              {Object.keys(gridEdits).length} unsaved row(s)
            </span>
          )}
          {freezeDescription && (
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Pin className="w-3 h-3 text-indigo-400 rotate-45" /> Description Pane Frozen
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAllGridEdits}
            disabled={Object.keys(gridEdits).length === 0 || isBatchSavingGrid}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              Object.keys(gridEdits).length > 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All</span>
          </button>

          {onExitGridMode && (
            <button
              onClick={onExitGridMode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Grid Mode</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

