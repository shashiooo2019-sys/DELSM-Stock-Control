'use client';

import React from 'react';
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
  X
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
              Edit any field directly in the table like a spreadsheet. Changes sync to Firebase Firestore database.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            Showing {filteredArticles.length} items (click any input field to edit)
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

      {/* High Density Editable Excel Grid */}
      <div className="overflow-x-auto max-h-[70vh]">
        <table className="w-full text-left border-collapse border-spacing-0">
          <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold border-b border-slate-300 shadow-2xs">
            <tr>
              <th className="p-2 w-10 text-center bg-slate-100 border-r border-slate-200">
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
              </th>
              <th className="p-2.5 min-w-[120px] bg-slate-100 border-r border-slate-200">Article #</th>
              <th className="p-2.5 min-w-[220px] bg-slate-100 border-r border-slate-200">Description</th>
              <th className="p-2.5 min-w-[130px] bg-slate-100 border-r border-slate-200">Location</th>
              <th className="p-2.5 min-w-[130px] bg-slate-100 border-r border-slate-200">Current Stock</th>
              <th className="p-2.5 min-w-[90px] bg-slate-100 border-r border-slate-200">Min Qty</th>
              <th className="p-2.5 min-w-[90px] bg-slate-100 border-r border-slate-200">Reorder Level</th>
              <th className="p-2.5 min-w-[90px] bg-slate-100 border-r border-slate-200">Max Qty</th>
              <th className="p-2.5 min-w-[100px] bg-slate-100 border-r border-slate-200">Monthly Usage</th>
              <th className="p-2.5 min-w-[130px] bg-slate-100 border-r border-slate-200">Barcode</th>
              <th className="p-2.5 min-w-[130px] bg-slate-100 border-r border-slate-200">Route</th>
              <th className="p-2.5 min-w-[80px] bg-slate-100 border-r border-slate-200">Lead Days</th>
              <th className="p-2.5 min-w-[80px] bg-slate-100 border-r border-slate-200">Boxes/Pack</th>
              <th className="p-2.5 min-w-[80px] bg-slate-100 border-r border-slate-200">Units/Box</th>
              <th className="p-2.5 min-w-[90px] bg-slate-100 border-r border-slate-200">Unit Name</th>
              <th className="p-2.5 min-w-[200px] bg-slate-100 border-r border-slate-200">Quantity Details</th>
              <th className="p-2.5 min-w-[180px] bg-slate-100 border-r border-slate-200">Remarks / Add Info</th>
              <th className="p-2.5 min-w-[100px] text-right bg-slate-100">Actions</th>
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

                return (
                  <tr
                    key={article.article_number}
                    className={`transition ${
                      isModified
                        ? 'bg-amber-50/70 hover:bg-amber-100/60 border-l-4 border-l-amber-500'
                        : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/70'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-2 border-r border-slate-200 text-center">
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
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-800 select-none">
                      <div className="flex items-center gap-1">
                        <span>{article.article_number}</span>
                        {isModified && <span className="text-[9px] bg-amber-500 text-slate-950 font-extrabold px-1 rounded">MOD</span>}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={desc || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'description', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs font-semibold text-slate-800 outline-none transition"
                      />
                    </td>

                    {/* Location */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        list="grid-locations-list"
                        value={loc || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'location', e.target.value.toUpperCase())}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-indigo-50/50 hover:bg-indigo-50 focus:bg-white border border-indigo-100 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 font-mono text-xs font-bold text-indigo-900 outline-none transition uppercase"
                        placeholder="LOCATION..."
                      />
                    </td>

                    {/* Current Stock */}
                    <td className="p-1 border-r border-slate-200">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={stock ?? 0}
                          onChange={(e) => handleGridCellChange(article.article_number, 'currentStock', e.target.value)}
                          onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                          className="w-20 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs font-bold text-slate-900 outline-none text-right transition"
                        />
                        <span className={`text-[9px] font-bold border px-1 py-0.5 rounded whitespace-nowrap ${statusBadge.bg}`}>
                          {statusBadge.text}
                        </span>
                      </div>
                    </td>

                    {/* Min Quantity */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        value={minQ ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'min_quantity', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Reorder Level */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        value={reorder ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'reorder_level', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 rounded px-2 py-1 font-mono text-xs font-bold text-red-600 outline-none text-right transition"
                      />
                    </td>

                    {/* Max Quantity */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        value={maxQ ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'max_quantity', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Monthly Usage */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        value={monthly ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'estimated_monthly_usage', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Barcode */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={code || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'barcode', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none transition"
                      />
                    </td>

                    {/* Route */}
                    <td className="p-1 border-r border-slate-200">
                      <select
                        value={route || 'Central'}
                        onChange={(e) => {
                          handleGridCellChange(article.article_number, 'ordering_channel', e.target.value, true);
                        }}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-1 text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="Central">Central Team</option>
                        <option value="Local">Local Purchase</option>
                      </select>
                    </td>

                    {/* Lead Days */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        value={lead ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'lead_time_days', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Boxes / Pack */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        value={bpp ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'boxes_per_pack', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Units / Box */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        value={upb ?? 0}
                        onChange={(e) => handleGridCellChange(article.article_number, 'units_per_box', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
                      />
                    </td>

                    {/* Unit Name */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={unitName || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'smallest_unit_name', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition"
                      />
                    </td>

                    {/* Quantity Details */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={qtySpec || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'quantity_details', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition"
                        placeholder="e.g. 5 boxes x 20 rolls..."
                      />
                    </td>

                    {/* Remarks */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={addInfo || ''}
                        onChange={(e) => handleGridCellChange(article.article_number, 'add_info', e.target.value)}
                        onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition"
                        placeholder="e.g. Recounted on Monday..."
                      />
                    </td>

                    {/* Row Actions */}
                    <td className="p-2 text-right">
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
