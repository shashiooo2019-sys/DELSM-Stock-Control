'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { Package, Barcode, MapPin, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Truck, Calendar, ArrowRight, Search, Plus, CreditCard as Edit2, Trash2, History, ChevronRight, ChevronDown, List, Sparkles, Clock, Settings, Volume2, VolumeX, Camera, Database, CornerDownRight, RefreshCw, TrendingDown, Inbox, LayoutGrid, Info, Layers, Archive, ArrowUpDown, FileSpreadsheet, User, Lock, Clock as Unlock, Shield, LogIn, LogOut, Menu, Upload, Maximize2, Save, FileText, CloudUpload, CircleAlert as AlertCircle } from 'lucide-react';
import type {
  StockMaster,
  StockTakingLog,
  PurchaseOrder,
  OrderingChannel,
  StockTakingInputType,
  DiscrepancyStatus,
  POStatus,
} from '@/lib/db';
import type { InventoryStore } from '@/lib/inventory-store';

export default function SharedModals({ store }: { store: InventoryStore }) {
  const {
  db,
  activeTab,
  setActiveTab,
  isSidebarVisible,
  setIsSidebarVisible,
  isMounted,
  currentUser,
  isLoginModalOpen,
  setIsLoginModalOpen,
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  loginError,
  setLoginError,
  simulatedDate,
  setSimulatedDate,
  searchQuery,
  setSearchQuery,
  channelFilter,
  setChannelFilter,
  stockFilter,
  setStockFilter,
  locationFilter,
  setLocationFilter,
  stockViewMode,
  setStockViewMode,
  collapsedLocations,
  setCollapsedLocations,
  scannedBarcode,
  setScannedBarcode,
  scannerStatus,
  setScannerStatus,
  scannerError,
  setScannerError,
  useCamera,
  setUseCamera,
  soundEnabled,
  setSoundEnabled,
  videoRef,
  mediaStreamRef,
  fuzzyQuery,
  setFuzzyQuery,
  fuzzyDropdownOpen,
  setFuzzyDropdownOpen,
  scanPacks,
  setScanPacks,
  scanBoxes,
  setScanBoxes,
  scanUnits,
  setScanUnits,
  scannedArticle,
  setScannedArticle,
  isArticleModalOpen,
  setIsArticleModalOpen,
  isExcelImportModalOpen,
  setIsExcelImportModalOpen,
  isMappingModalOpen,
  setIsMappingModalOpen,
  excelHeaders,
  setExcelHeaders,
  columnMapping,
  setColumnMapping,
  importedData,
  setImportedData,
  selectedArticleNumbers,
  setSelectedArticleNumbers,
  editingArticle,
  setEditingArticle,
  articleForm,
  setArticleForm,
  activePhotoModalArticle,
  setActivePhotoModalArticle,
  stagedPhotoBase64,
  setStagedPhotoBase64,
  isSavingPhoto,
  setIsSavingPhoto,
  photoSuccessMsg,
  setPhotoSuccessMsg,
  lightboxImageUrl,
  setLightboxImageUrl,
  isCameraActive,
  setIsCameraActive,
  photoVideoRef,
  photoStreamRef,
  compressImageFile,
  startPhotoCamera,
  stopPhotoCamera,
  snapPhotoFromCamera,
  handleFileUpload,
  handleSavePhotoToFirebase,
  handleDeletePhotoFromFirebase,
  updateArticlePhoto,
  ItemPhotoTrigger,
  isManualPOModalOpen,
  setIsManualPOModalOpen,
  isQuickOrderModalOpen,
  setIsQuickOrderModalOpen,
  quickOrderArticle,
  setQuickOrderArticle,
  quickOrderQty,
  setQuickOrderQty,
  quantityError,
  setQuantityError,
  manualPOForm,
  setManualPOForm,
  selectedPOWorkflow,
  setSelectedPOWorkflow,
  isReceivePromptOpen,
  setIsReceivePromptOpen,
  poToReceive,
  setPoToReceive,
  isFabOpen,
  setIsFabOpen,
  receiveCupboard,
  setReceiveCupboard,
  receiveShelf,
  setReceiveShelf,
  receiveQty,
  setReceiveQty,
  selectedReorders,
  setSelectedReorders,
  overrideReorderQtys,
  setOverrideReorderQtys,
  selectedArticleFilter,
  setSelectedArticleFilter,
  analyticsChartType,
  setAnalyticsChartType,
  analyticsMounted,
  confirmDeleteModal,
  setConfirmDeleteModal,
  updateDb,
  playBeep,
  playErrorBeep,
  advanceTime,
  resetToToday,
  stopCamera,
  handleSimulateScan,
  handleManualBarcodeSubmit,
  handleSavePhysicalCount,
  handleOpenAddModal,
  handleOpenEditModal,
  handleDeleteArticle,
  handleConfirmDeletion,
  handleSaveArticle,
  handleExcelImport,
  handleImageUpload,
  handleQuickOrder,
  performQuickOrder,
  handleGenerateBulkPOs,
  handleCreateManualPO,
  handleExportToExcel,
  handleExportSelectedReorders,
  handleExportCreatedPOs,
  handlePOStateChange,
  handleOpenReceivePrompt,
  handleConfirmReceive,
  handleRejectDelivery,
  handleReceivePO,
  isBarcodeTagsModalOpen,
  setIsBarcodeTagsModalOpen,
  handleLogin,
  handleLogout,
  evaluatedArticles,
  kpis,
  uniqueLocations,
  filteredArticles,
  articlesByLocation,
  suggestedOrders,
  monthlyData,
  analyticsKPIs,
  createId,
  getPackagingBreakdown,
  levenshteinDistance,
  fuzzySearch,
  calculateDailyBurnRate,
  convertToSmallestUnits,
  getExpectedStock,
  evaluateSuppression,
  saveStockMasterToFirestore,
  deleteStockMasterFromFirestore,
  saveStockLogToFirestore,
  deleteStockLogFromFirestore,
  savePurchaseOrderToFirestore,
  deletePurchaseOrderFromFirestore
  } = store;
  return (
    <>      {isArticleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingArticle ? "Edit Master Stock Article" : "Create Master Stock Article"}
              </h3>
              <button 
                onClick={() => setIsArticleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Article Number (Unique ID)</label>
                  <input
                    type="text"
                    disabled={!!editingArticle}
                    value={articleForm.article_number}
                    onChange={(e) => setArticleForm({ ...articleForm, article_number: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Barcode (Scannable Code)</label>
                  <input
                    type="text"
                    value={articleForm.barcode}
                    onChange={(e) => setArticleForm({ ...articleForm, barcode: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={articleForm.description}
                  onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                  placeholder="e.g. Handmade Calligraphy Parchment Paper"
                  className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">General Location / Store</label>
                <input
                  type="text"
                  value={articleForm.location}
                  onChange={(e) => setArticleForm({ ...articleForm, location: e.target.value })}
                  placeholder="e.g. Storage Room A, Bin 12"
                  className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Quantity Details (Short Text)</label>
                  <input
                    type="text"
                    value={articleForm.quantity_details || ''}
                    onChange={(e) => setArticleForm({ ...articleForm, quantity_details: e.target.value })}
                    placeholder="e.g. Bulk pack / Box of 10"
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Add Info / Notes (Short Text)</label>
                  <input
                    type="text"
                    value={articleForm.add_info || ''}
                    onChange={(e) => setArticleForm({ ...articleForm, add_info: e.target.value })}
                    placeholder="e.g. Fragile / Standard stock"
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Item Image (App Files & Cloud DB)</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-4">
                    {(articleForm.image_base64 || articleForm.image_url) ? (
                      <div className="relative group w-16 h-16 shrink-0">
                        <img 
                          src={articleForm.image_base64 || articleForm.image_url} 
                          alt="Preview" 
                          className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-xs"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                        <Package className="w-6 h-6 mb-0.5 text-slate-300" />
                        <span className="text-[9px] font-bold">No Image</span>
                      </div>
                    )}
                    <div className="space-y-1 flex-1">
                      <label className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1.5 shadow-2xs transition">
                        <Upload className="w-3.5 h-3.5" />
                        {(articleForm.image_base64 || articleForm.image_url) ? "Change Photo" : "Upload Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      {(articleForm.image_base64 || articleForm.image_url) && (
                        <button
                          type="button"
                          onClick={() => setArticleForm({ ...articleForm, image_base64: '', image_url: '' })}
                          className="text-[11px] text-red-600 hover:text-red-700 font-semibold ml-2 inline-block transition"
                        >
                          Remove Photo
                        </button>
                      )}
                      <p className="text-[10px] text-slate-400">Photo will be saved to server files & Firestore DB to be visible to all users.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Smallest Unit Name</label>
                  <input
                    type="text"
                    value={articleForm.smallest_unit_name}
                    onChange={(e) => setArticleForm({ ...articleForm, smallest_unit_name: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Units per Box</label>
                  <input
                    type="number"
                    value={articleForm.units_per_box}
                    onChange={(e) => setArticleForm({ ...articleForm, units_per_box: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Boxes per Pack</label>
                  <input
                    type="number"
                    value={articleForm.boxes_per_pack}
                    onChange={(e) => setArticleForm({ ...articleForm, boxes_per_pack: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Est. Monthly Usage (Smallest Units)</label>
                  <input
                    type="number"
                    value={articleForm.estimated_monthly_usage}
                    onChange={(e) => setArticleForm({ ...articleForm, estimated_monthly_usage: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Standard PO Volume (Units)</label>
                  <input
                    type="number"
                    value={articleForm.order_volume}
                    onChange={(e) => setArticleForm({ ...articleForm, order_volume: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Min Level</label>
                  <input
                    type="number"
                    value={articleForm.min_quantity}
                    onChange={(e) => setArticleForm({ ...articleForm, min_quantity: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={articleForm.reorder_level}
                    onChange={(e) => setArticleForm({ ...articleForm, reorder_level: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Max Level</label>
                  <input
                    type="number"
                    value={articleForm.max_quantity}
                    onChange={(e) => setArticleForm({ ...articleForm, max_quantity: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Total Stock Qty</label>
                  <input
                    type="number"
                    value={articleForm.total_stock_quantity}
                    onChange={(e) => setArticleForm({ ...articleForm, total_stock_quantity: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-500 font-semibold mb-1">Ordering Route Channel</label>
                  <select
                    value={articleForm.ordering_channel}
                    onChange={(e) => setArticleForm({ ...articleForm, ordering_channel: e.target.value as OrderingChannel })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50"
                  >
                    <option value="Local">Local</option>
                    <option value="Central Ordering Team">Central Ordering Team</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={articleForm.lead_time_days}
                    onChange={(e) => setArticleForm({ ...articleForm, lead_time_days: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                {editingArticle && currentUser?.role === 'admin' ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteArticle(editingArticle.article_number)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2 rounded-lg border border-red-200 transition flex items-center gap-1.5 cursor-pointer"
                    title="Delete Article Spec (Admin Access)"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Article</span>
                  </button>
                ) : <div />}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsArticleModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg transition shadow-sm hover:shadow"
                  >
                    Save Item Spec
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {isExcelImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">Import Delhi Station Stock from Excel</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Map Excel sheet columns to the database fields and preview before importing.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setImportedData([]);
                  setExcelHeaders([]);
                  setColumnMapping({});
                }}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {importedData.length === 0 ? (
                // Upload excel file step
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-10 text-center transition bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Choose Excel File</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 font-sans">Upload a `.xlsx` or `.xls` spreadsheet with your station&apos;s master items.</p>
                  </div>
                  <div className="pt-2">
                    <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-sm hover:shadow cursor-pointer inline-block">
                      Select Spreadsheet
                      <input 
                        type="file" 
                        onChange={handleExcelImport} 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              ) : (
                // Map columns and live preview step
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left panel - Dropdown selectors */}
                  <div className="lg:col-span-5 space-y-4 bg-slate-50/50 border border-slate-100 rounded-xl p-4 max-h-[60vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Field Mapping</h4>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Auto-Matched</span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'article_number', label: 'Article Number *', required: true, desc: 'Unique identifier for the stock item.' },
                        { key: 'description', label: 'Item Description *', required: true, desc: 'Name or description of the product.' },
                        { key: 'barcode', label: 'Barcode / EAN', required: false, desc: 'Optional UPC/EAN barcode.' },
                        { key: 'total_stock_quantity', label: 'Total Stock Quantity (Numeric Count)', required: false, desc: 'Numeric quantity on hand in smallest units.' },
                        { key: 'quantity_details', label: 'Quantity Text (Free Text)', required: false, desc: 'Text description for quantity e.g. "Box of 10", "100 sheets", "50kg bag".' },
                        { key: 'add_info', label: 'Remarks / Notes (Free Text)', required: false, desc: 'Free text remarks, notes, or special handling instructions.' },
                        { key: 'smallest_unit_name', label: 'Smallest Unit Name', required: false, desc: 'E.g., Piece, Ampoule, Vial, Bottle (default: Piece).' },
                        { key: 'units_per_box', label: 'Units per Box', required: false, desc: 'How many smallest units fit in a Box (default: 1).' },
                        { key: 'boxes_per_pack', label: 'Boxes per Pack', required: false, desc: 'How many boxes fit in a Pack (default: 1).' },
                        { key: 'estimated_monthly_usage', label: 'Estimated Monthly Usage', required: false, desc: 'Average monthly demand in units.' },
                        { key: 'min_quantity', label: 'Min Stock Level', required: false, desc: 'Absolute minimum threshold.' },
                        { key: 'reorder_level', label: 'Reorder Trigger Level', required: false, desc: 'Stock level at which reorder triggers.' },
                        { key: 'max_quantity', label: 'Max Stock Level', required: false, desc: 'Safe maximum shelf threshold.' },
                        { key: 'order_frequency_days', label: 'Order Frequency (Days)', required: false, desc: 'Standard order cycle interval.' },
                        { key: 'order_volume', label: 'Reorder Volume', required: false, desc: 'Usual quantity ordered.' },
                        { key: 'ordering_channel', label: 'Ordering Channel (Route)', required: false, desc: 'Local or Central Ordering Team.' },
                        { key: 'lead_time_days', label: 'Supplier Lead Time (Days)', required: false, desc: 'Supplier fulfillment wait days.' },
                        { key: 'location', label: 'General Location / Store', required: false, desc: 'Primary physical area where the item is stored.' },
                      ].map(field => {
                        const isAutoMatched = !!columnMapping[field.key];
                        return (
                          <div key={field.key} className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100 shadow-3xs">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-800">
                                {field.label}
                              </span>
                              {isAutoMatched && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-sans">Matched</span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 font-sans leading-tight">{field.desc}</p>
                            <select 
                              className="w-full border border-slate-200 p-1.5 rounded text-xs bg-slate-50 focus:bg-white transition"
                              onChange={(e) => setColumnMapping({...columnMapping, [field.key]: e.target.value})}
                              value={columnMapping[field.key] || ''}
                            >
                              <option value="">-- Click to select spreadsheet column --</option>
                              {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right panel - Live Preview and Validation */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* File info card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Spreadsheet Loaded</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Found {excelHeaders.length} total columns and {importedData.length} records ready to map.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setImportedData([]);
                          setExcelHeaders([]);
                          setColumnMapping({});
                        }}
                        className="text-xs text-slate-600 hover:text-red-600 underline font-semibold focus:outline-none cursor-pointer font-sans"
                      >
                        Reset & Re-upload
                      </button>
                    </div>

                    {/* Mapping checklist validation */}
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-xs text-slate-700">Verification Checklist</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          {columnMapping.article_number ? (
                            <span className="text-emerald-600 font-bold font-sans">✓</span>
                          ) : (
                            <span className="text-amber-500 font-bold font-sans">⚠</span>
                          )}
                          <span className={`${columnMapping.article_number ? 'text-slate-700 font-semibold' : 'text-slate-400'} font-sans`}>
                            Article Number Column Mapped
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {columnMapping.description ? (
                            <span className="text-emerald-600 font-bold font-sans">✓</span>
                          ) : (
                            <span className="text-amber-500 font-bold font-sans">⚠</span>
                          )}
                          <span className={`${columnMapping.description ? 'text-slate-700 font-semibold' : 'text-slate-400'} font-sans`}>
                            Description Column Mapped
                          </span>
                        </div>
                      </div>
                      {!(columnMapping.article_number && columnMapping.description) && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-[10px] text-amber-800 font-sans leading-tight">
                          Please map the two required fields (marked with *) to enable the database import process.
                        </div>
                      )}
                    </div>

                    {/* Live Preview Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <h4 className="font-bold text-xs text-slate-800">Interactive Mapped Data Preview (First 3 rows)</h4>
                        <p className="text-[9px] text-slate-500 font-sans mt-0.5 font-sans">This updates dynamically as you change column selectors on the left.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-mono text-[9px] uppercase">
                              <th className="py-2 px-3">Article No</th>
                              <th className="py-2 px-3">Description</th>
                              <th className="py-2 px-3">Barcode</th>
                              <th className="py-2 px-3">Quantity Text</th>
                              <th className="py-2 px-3">Remarks / Notes</th>
                              <th className="py-2 px-3">Stock Count</th>
                              <th className="py-2 px-3">Location</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {importedData.slice(0, 3).map((item, idx) => {
                              const articleNum = item[columnMapping.article_number];
                              const desc = item[columnMapping.description];
                              const bar = item[columnMapping.barcode];
                              const qtyText = item[columnMapping.quantity_details];
                              const remarks = item[columnMapping.add_info];
                              const totalQty = item[columnMapping.total_stock_quantity];
                              const loc = item[columnMapping.location];
                              
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                    {articleNum ? String(articleNum) : <span className="text-red-500 italic">Not Mapped</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate">
                                    {desc ? String(desc) : <span className="text-red-500 italic">Not Mapped</span>}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-500">
                                    {bar ? String(bar) : <span className="text-slate-300 italic">Empty</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 font-sans">
                                    {qtyText ? String(qtyText) : <span className="text-slate-300 italic">N/A</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 font-sans max-w-[140px] truncate">
                                    {remarks ? String(remarks) : <span className="text-slate-300 italic">N/A</span>}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                    {totalQty !== undefined && totalQty !== '' ? String(totalQty) : <span className="text-slate-300 italic">0</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 font-mono">
                                    {loc ? String(loc) : <span className="text-slate-300 italic">N/A</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Final Action buttons */}
                    <div className="pt-4 flex justify-end gap-2 text-xs border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setIsExcelImportModalOpen(false);
                          setImportedData([]);
                          setExcelHeaders([]);
                          setColumnMapping({});
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer font-sans"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!(columnMapping.article_number && columnMapping.description)}
                        onClick={() => {
                          console.log("Confirming Mapping & Importing...");
                          
                          // Final map of all raw excel rows using selected column mapping
                          const newItems = importedData.map(item => {
                            const mappedItem: any = {};
                            mappedItem.article_number = String(item[columnMapping.article_number] ?? '').trim();
                            mappedItem.description = String(item[columnMapping.description] ?? '').trim();
                            mappedItem.barcode = String(item[columnMapping.barcode] ?? '').trim();
                            mappedItem.smallest_unit_name = String(item[columnMapping.smallest_unit_name] || 'Piece').trim();
                            mappedItem.units_per_box = item[columnMapping.units_per_box] !== undefined && item[columnMapping.units_per_box] !== '' ? Number(item[columnMapping.units_per_box]) : 1;
                            mappedItem.boxes_per_pack = item[columnMapping.boxes_per_pack] !== undefined && item[columnMapping.boxes_per_pack] !== '' ? Number(item[columnMapping.boxes_per_pack]) : 1;
                            mappedItem.estimated_monthly_usage = item[columnMapping.estimated_monthly_usage] !== undefined && item[columnMapping.estimated_monthly_usage] !== '' ? Number(item[columnMapping.estimated_monthly_usage]) : 0;
                            mappedItem.order_frequency_days = item[columnMapping.order_frequency_days] !== undefined && item[columnMapping.order_frequency_days] !== '' ? Number(item[columnMapping.order_frequency_days]) : 30;
                            mappedItem.min_quantity = item[columnMapping.min_quantity] !== undefined && item[columnMapping.min_quantity] !== '' ? Number(item[columnMapping.min_quantity]) : 0;
                            mappedItem.reorder_level = item[columnMapping.reorder_level] !== undefined && item[columnMapping.reorder_level] !== '' ? Number(item[columnMapping.reorder_level]) : 0;
                            mappedItem.max_quantity = item[columnMapping.max_quantity] !== undefined && item[columnMapping.max_quantity] !== '' ? Number(item[columnMapping.max_quantity]) : 0;
                            mappedItem.total_stock_quantity = item[columnMapping.total_stock_quantity] !== undefined && item[columnMapping.total_stock_quantity] !== '' ? Number(item[columnMapping.total_stock_quantity]) : 0;
                            mappedItem.order_volume = item[columnMapping.order_volume] !== undefined && item[columnMapping.order_volume] !== '' ? Number(item[columnMapping.order_volume]) : 0;
                            
                            const rawChannel = String(item[columnMapping.ordering_channel] ?? '').trim().toLowerCase();
                            mappedItem.ordering_channel = (rawChannel.includes('central') || rawChannel.includes('import') || rawChannel.includes('team')) ? 'Central Ordering Team' : 'Local';
                            
                            mappedItem.lead_time_days = item[columnMapping.lead_time_days] !== undefined && item[columnMapping.lead_time_days] !== '' ? Number(item[columnMapping.lead_time_days]) : 5;
                            mappedItem.location = String(item[columnMapping.location] ?? '').trim();
                            mappedItem.quantity_details = String(item[columnMapping.quantity_details] ?? '').trim();
                            mappedItem.add_info = String(item[columnMapping.add_info] ?? '').trim();
                            mappedItem.image_url = '';
                            mappedItem.image_base64 = '';
                            return mappedItem;
                          });

                          // Filter out any entries that didn't map a valid article_number or description
                          const validItems = newItems.filter(item => item.article_number !== '' && item.description !== '');

                          if (validItems.length === 0) {
                            alert("No valid items with a populated Article Number and Description were found after mapping. Please verify the columns selection.");
                            return;
                          }

                          const existingItemsMap = new Map(db.stockMaster.map(m => [m.article_number, m]));
                          let newCount = 0;
                          let updatedCount = 0;

                          validItems.forEach(item => {
                            if (existingItemsMap.has(item.article_number)) {
                              existingItemsMap.set(item.article_number, { ...existingItemsMap.get(item.article_number), ...item });
                              updatedCount++;
                            } else {
                              existingItemsMap.set(item.article_number, item);
                              newCount++;
                            }
                          });

                          updateDb({ 
                            ...db, 
                            stockMaster: Array.from(existingItemsMap.values())
                          });

                          alert(`Import completed successfully!\n\n• New Items Added: ${newCount}\n• Existing Items Updated: ${updatedCount}\n• Filtered out (Empty rows): ${newItems.length - validItems.length}`);

                          // Play beep and clear import modal
                          playBeep();
                          setImportedData([]);
                          setExcelHeaders([]);
                          setColumnMapping({});
                          setIsExcelImportModalOpen(false);
                        }}
                        className={`font-bold px-6 py-2.5 rounded-lg transition shadow-sm font-sans ${
                          (columnMapping.article_number && columnMapping.description)
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Yes, Confirm & Import {importedData.length} Items
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          BARCODE TAGS GENERATOR DIALOG
          ---------------------------------------------------- */}
      {isBarcodeTagsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-100 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-base">Delhi Station Barcode Tag Generator</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Generate, customize, and print high-fidelity physical inventory label tags.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  Print Label Sheet
                </button>
                <button 
                  type="button"
                  onClick={() => setIsBarcodeTagsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xl font-bold p-1"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Print-specific style tag */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-barcode-sheet, #printable-barcode-sheet * {
                  visibility: visible !important;
                }
                #printable-barcode-sheet {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  padding: 1.5rem !important;
                  margin: 0 !important;
                  display: grid !important;
                  grid-template-cols: repeat(2, minmax(0, 1fr)) !important;
                  gap: 1.5rem !important;
                }
              }
            `}} />

            {/* Modal Controls */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap gap-4 items-center justify-between shrink-0 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Filter Dataset:</span>
                <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                  {searchQuery ? `Search matches ("${searchQuery}")` : "All Master Items"} ({db.stockMaster.filter(item => {
                    const matchesSearch = searchQuery === '' || 
                      item.article_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.barcode.includes(searchQuery);
                    return matchesSearch;
                  }).length} items)
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Tip: Use standard Letter or A4 sheets. Labels are sized for 3.5&quot; x 2&quot; label stock.
              </p>
            </div>

            {/* Modal Body / Tag Sheet */}
            <div className="p-6 overflow-y-auto bg-slate-50 flex-grow">
              <div 
                id="printable-barcode-sheet" 
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {db.stockMaster
                  .filter(item => {
                    const matchesSearch = searchQuery === '' || 
                      item.article_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.barcode.includes(searchQuery);
                    return matchesSearch;
                  })
                  .map((item, index) => {
                    return (
                      <div 
                        key={`${item.article_number}-${index}`} 
                        className="bg-white border-2 border-slate-300 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden"
                        style={{ minHeight: '200px', pageBreakInside: 'avoid' }}
                      >
                        {/* Decorative tag corners */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500 rounded-tl-xl pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500 rounded-br-xl pointer-events-none" />
                        
                        <div>
                          {/* Tag Header */}
                          <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                            <div>
                              <span className="text-[8px] tracking-widest font-bold text-slate-400 uppercase block">DELSM INVENTORY</span>
                              <span className="text-[9px] font-mono font-semibold text-slate-500">ROUTE: {item.ordering_channel}</span>
                            </div>
                            <span className="bg-slate-900 text-amber-400 font-mono font-black text-xs px-2 py-1 rounded">
                              {item.article_number}
                            </span>
                          </div>

                          {/* Item Details */}
                          <h4 className="font-bold text-xs text-slate-800 line-clamp-2 h-8 leading-tight mb-2">
                            {item.description}
                          </h4>

                          {/* Location Badge */}
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">LOC</span>
                            <span className="text-[10px] font-bold text-slate-700 truncate">
                              {item.location || 'UNALLOCATED'}
                            </span>
                          </div>

                          {/* Multi-tier Pack Hierarchy Spec */}
                          <div className="bg-slate-50 p-1.5 rounded text-[9px] text-slate-600 mb-3 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Packaging Conversion:</span>
                              <strong className="text-slate-800">
                                1 PK = {item.boxes_per_pack} BX &bull; 1 BX = {item.units_per_box} {item.smallest_unit_name}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* QR Code */}
                        <div className="space-y-1 mt-auto flex flex-col items-center">
                          <QRCodeCanvas 
                            value={JSON.stringify({
                              article_number: item.article_number, 
                              description: item.description,
                              location: item.location || 'UNALLOCATED'
                            })} 
                            size={80}
                            className="border border-slate-200 p-1"
                          />
                          <div className="text-center font-mono text-[9px] text-slate-500 font-bold tracking-widest mt-1">
                            {item.article_number}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                Pressing &quot;Print Label Sheet&quot; isolates these cards automatically for perfect label alignment.
              </span>
              <button
                type="button"
                onClick={() => setIsBarcodeTagsModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg transition"
              >
                Close Tag Generator
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ----------------------------------------------------
          CUSTOM DELETE CONFIRMATION DIALOG
          ---------------------------------------------------- */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 border-b border-slate-100 pb-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
              <h3 className="font-bold text-lg text-slate-900">
                {confirmDeleteModal.title}
              </h3>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed font-sans">
              {confirmDeleteModal.description}
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 leading-normal flex gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>This action is immediate and cannot be undone. All related database registers will be cleaned.</span>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(prev => ({ ...prev, isOpen: false }))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletion}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-lg transition shadow-sm hover:shadow"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SELECT STORAGE LOCATION FOR DELIVERY RECEIVE DIALOG
          ---------------------------------------------------- */}
      {isReceivePromptOpen && poToReceive && (
        <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-base text-slate-900">
                  Receive Stock Delivery
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsReceivePromptOpen(false);
                  setPoToReceive(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <p className="text-slate-600 leading-normal">
                You are accepting the delivery of <strong className="text-slate-900">{(poToReceive.order_quantity_units ?? 0).toLocaleString()} units</strong> for article <strong className="text-slate-900">{poToReceive.article_number}</strong>.
              </p>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Quantity Received</label>
                <input
                  type="number"
                  value={receiveQty}
                  onChange={(e) => {
                    setReceiveQty(Number(e.target.value));
                    if(Number(e.target.value) > 0) setQuantityError('');
                  }}
                  className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition outline-none"
                  placeholder="Enter quantity"
                />
                {quantityError && <p className="text-[10px] text-red-600 mt-1">{quantityError}</p>}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsReceivePromptOpen(false);
                  setPoToReceive(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (receiveQty <= 0) {
                      setQuantityError('Quantity must be greater than 0');
                      return;
                  }
                  setQuantityError('');
                  handleConfirmReceive(poToReceive, receiveQty);
                  setIsReceivePromptOpen(false);
                  setPoToReceive(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg transition text-xs shadow-sm"
              >
                Accept & Receive Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          CREATE MANUAL PURCHASE ORDER DIALOG
          ---------------------------------------------------- */}
      {isQuickOrderModalOpen && quickOrderArticle && (
        <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900">Confirm Quick Order</h3>
            <p className="text-slate-600 text-xs">
              Confirm purchase order for <strong>{quickOrderArticle.article_number}</strong>:
            </p>
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Order Quantity</label>
              <input
                type="number"
                value={quickOrderQty}
                onChange={(e) => {
                  setQuickOrderQty(Number(e.target.value));
                  if (Number(e.target.value) > 0) setQuantityError('');
                }}
                className={`w-full border p-2.5 rounded-lg bg-slate-50 text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none ${quantityError ? 'border-red-500' : 'border-slate-200'}`}
              />
              {quantityError && <p className="text-[10px] text-red-600 mt-1">{quantityError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsQuickOrderModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performQuickOrder}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition text-xs shadow-sm"
              >
                Place PO Now
              </button>
            </div>
          </div>
        </div>
      )}

      {isManualPOModalOpen && (
        <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">
                  Create Manual Purchase Order
                </h3>
              </div>
              <button 
                onClick={() => setIsManualPOModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateManualPO} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Select Article</label>
                <select
                  value={manualPOForm.article_number}
                  onChange={(e) => {
                    const article = db.stockMaster.find(m => m.article_number === e.target.value);
                    if (article) {
                      setManualPOForm({
                        ...manualPOForm,
                        article_number: e.target.value,
                        order_quantity_units: article.order_volume,
                        lead_time_days: article.lead_time_days
                      });
                    }
                  }}
                  className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none"
                  required
                >
                  {db.stockMaster.map(item => (
                    <option key={item.article_number} value={item.article_number}>
                      {item.article_number} - {item.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Suggested Quantity Display */}
              {(() => {
                const computedArticle = filteredArticles.find(a => a.article_number === manualPOForm.article_number);
                if (!computedArticle) return null;
                const suggestedQty = Math.max(0, computedArticle.max_quantity - computedArticle.currentStock);
                return (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-amber-900">Suggested Order Qty:</div>
                      <div className="text-[10px] text-slate-500">To reach Maximum Capacity ({(computedArticle.max_quantity ?? 0).toLocaleString()} units)</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-800 text-xs">
                        {(suggestedQty ?? 0) > 0 ? `${(suggestedQty ?? 0).toLocaleString()} units` : "Fully Stocked (Standard Recommended)"}
                      </span>
                      {suggestedQty > 0 && (
                        <button
                          type="button"
                          onClick={() => setManualPOForm({ ...manualPOForm, order_quantity_units: suggestedQty })}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-1 rounded text-[10px] font-bold shadow-xs transition"
                        >
                          Use Suggested
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Order Quantity (Units)</label>
                  <input
                    type="number"
                    min={1}
                    value={manualPOForm.order_quantity_units}
                    onChange={(e) => {
                      setManualPOForm({ ...manualPOForm, order_quantity_units: Number(e.target.value) });
                      if (Number(e.target.value) > 0) setQuantityError('');
                    }}
                    className={`w-full border p-2.5 rounded-lg bg-slate-50 text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none ${quantityError ? 'border-red-500' : 'border-slate-200'}`}
                    required
                  />
                  {quantityError && <p className="text-[10px] text-red-600 mt-1">{quantityError}</p>}
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={manualPOForm.lead_time_days}
                    onChange={(e) => setManualPOForm({ ...manualPOForm, lead_time_days: Number(e.target.value) })}
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none"
                    required
                  />
                </div>
              </div>

              {/* Real-time Packaging Conversion Display */}
              {(() => {
                const selectedArticle = db.stockMaster.find(item => item.article_number === manualPOForm.article_number);
                if (!selectedArticle) return null;
                const qty = manualPOForm.order_quantity_units || 0;
                const unitsPerPack = selectedArticle.boxes_per_pack * selectedArticle.units_per_box;
                const packs = Math.floor(qty / unitsPerPack);
                const remainderAfterPacks = qty % unitsPerPack;
                const boxes = Math.floor(remainderAfterPacks / selectedArticle.units_per_box);
                const smallestUnits = remainderAfterPacks % selectedArticle.units_per_box;

                const parts = [];
                if (packs > 0) parts.push(`${packs} Pack(s)`);
                if (boxes > 0) parts.push(`${boxes} Box(es)`);
                if (smallestUnits > 0 || parts.length === 0) parts.push(`${smallestUnits} ${selectedArticle.smallest_unit_name}(s)`);
                const packagingText = parts.join(" + ");

                return (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 space-y-1">
                    <span className="font-semibold text-indigo-950 block">Real-time Packaging Conversion:</span>
                    <div className="font-mono text-indigo-900 font-bold text-xs">
                      {packagingText}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Conversion factor: 1 Pack = {selectedArticle.boxes_per_pack} Boxes ({unitsPerPack} {selectedArticle.smallest_unit_name}s) | 1 Box = {selectedArticle.units_per_box} {selectedArticle.smallest_unit_name}s
                    </div>
                  </div>
                );
              })()}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-[11px] text-slate-500 font-sans">
                <span className="font-semibold text-slate-600 block mb-0.5">PO Target Metrics:</span>
                <div>
                  Expected Delivery: <strong className="text-slate-700">
                    {(() => {
                      const expectedDel = new Date(simulatedDate);
                      expectedDel.setDate(expectedDel.getDate() + (manualPOForm.lead_time_days || 0));
                      return expectedDel.toISOString().split('T')[0];
                    })()}
                  </strong>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualPOModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg transition shadow-sm hover:shadow"
                >
                  Place PO Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          INTERACTIVE PURCHASE ORDER WORKFLOW DIALOG
          ---------------------------------------------------- */}
      {selectedPOWorkflow && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <span className="bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Fulfillment Wizard
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1 flex items-center gap-2">
                  <span>Purchase Order Workflow</span>
                  <span className="text-indigo-600">#{selectedPOWorkflow.po_number}</span>
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPOWorkflow(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Progress Visualizer */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-wider font-bold">
              <div className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                selectedPOWorkflow.status === 'Raised' 
                  ? 'bg-amber-50 border-amber-300 text-amber-800' 
                  : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}>
                <Clock className="w-4 h-4" />
                <span>1. Raised</span>
              </div>
              <div className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                selectedPOWorkflow.status === 'Approved' 
                  ? 'bg-blue-50 border-blue-300 text-blue-800' 
                  : selectedPOWorkflow.status === 'Received' || selectedPOWorkflow.status === 'Rejected'
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}>
                <Shield className="w-4 h-4" />
                <span>2. Approved</span>
              </div>
              <div className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${
                selectedPOWorkflow.status === 'Received'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : selectedPOWorkflow.status === 'Rejected'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
                <span>3. Closed</span>
              </div>
            </div>

            {/* Article Details */}
            {(() => {
              const article = db.stockMaster.find(m => m.article_number === selectedPOWorkflow.article_number);
              return (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex items-center gap-4">
                    {article?.image_url ? (
                      <img src={article.image_url} alt={article.description} className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center border border-slate-300 shrink-0">
                        <Package className="w-7 h-7 text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-grow text-xs space-y-1">
                      <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Article Specification</div>
                      <div className="font-bold text-slate-800 truncate text-sm">{article?.description || "Deleted Article"}</div>
                      <div className="font-mono text-slate-500">ID: {selectedPOWorkflow.article_number}</div>
                    </div>
                  </div>

                  {/* Metrics Table */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs font-sans">
                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Quantity Ordered</span>
                        <strong className="text-slate-800 font-mono text-sm">{(selectedPOWorkflow.order_quantity_units ?? 0).toLocaleString()} units</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Placed Date</span>
                        <strong className="text-slate-800 font-mono">{selectedPOWorkflow.order_date}</strong>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Expected Delivery</span>
                        <strong className="text-slate-800 font-mono">{selectedPOWorkflow.expected_delivery_date}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Status</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                          selectedPOWorkflow.status === 'Received' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : selectedPOWorkflow.status === 'Approved' 
                              ? 'bg-blue-100 text-blue-800 animate-pulse' 
                              : selectedPOWorkflow.status === 'Raised' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                          {selectedPOWorkflow.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Workflow Actions */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    {selectedPOWorkflow.status === 'Raised' && (
                      <div className="space-y-4">
                        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-1 text-xs">
                          <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-amber-600 shrink-0" />
                            Step 1: Authorization Required
                          </h4>
                          <p className="text-slate-600 leading-normal">
                            This purchase order has been raised successfully. You can now choose to either <strong className="text-slate-900">Approve PO</strong> to transition the order to in-transit shipment, or <strong className="text-slate-900">Reject PO</strong> to cancel this order.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handlePOStateChange(selectedPOWorkflow, 'Rejected')}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold p-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Reject PO</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePOStateChange(selectedPOWorkflow, 'Approved')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-xs shadow-md hover:shadow-lg"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve PO</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedPOWorkflow.status === 'Approved' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-1 text-xs">
                          <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                            Step 2: Delivery Verification
                          </h4>
                          <p className="text-slate-600 leading-normal">
                            This PO is approved and the logistics pipeline is active. Upon cargo arrival, choose <strong className="text-slate-900">Accept Delivery</strong> to receive the items into inventory stock, or <strong className="text-slate-900">Reject Delivery</strong> if the delivery was refused or failed.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleRejectDelivery(selectedPOWorkflow)}
                            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold p-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                          >
                            <AlertTriangle className="w-4 h-4 text-slate-500" />
                            <span>Reject Delivery</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReceivePO(selectedPOWorkflow)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-xs shadow-md hover:shadow-lg"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accept Delivery</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedPOWorkflow.status === 'Received' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
                        <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                          Fulfillment Completed Successfully
                        </h4>
                        <p className="text-slate-600 leading-normal">
                          This purchase order has been fully received. The corresponding quantity of <strong className="text-slate-800">{selectedPOWorkflow.order_quantity_units.toLocaleString()} units</strong> has been added to the master shelf location for <strong className="text-slate-800">{article?.description}</strong>.
                        </p>
                      </div>
                    )}

                    {selectedPOWorkflow.status === 'Rejected' && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs space-y-2">
                        <h4 className="font-bold text-red-950 flex items-center gap-1.5">
                          <Trash2 className="w-4.5 h-4.5 text-red-500 shrink-0" />
                          Purchase Order Cancelled / Rejected
                        </h4>
                        <p className="text-red-900 leading-normal">
                          This PO was formally rejected or cancelled. No transit or inventory adjustments were made.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer Controls */}
            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPOWorkflow(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
              >
                Close Wizard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" id="dashboard-fab">
        {/* Backdrop for closing when open */}
        {isFabOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-40 transition-all duration-200" 
            onClick={() => setIsFabOpen(false)}
          />
        )}

        {/* Expanded Speed Dial Menu */}
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-end gap-2.5 mb-2 z-50 relative"
            >
              {/* Action 1: Create PO */}
              <div className="flex items-center gap-2">
                <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm font-sans whitespace-nowrap">
                  Create PO
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (db.stockMaster.length > 0) {
                      setManualPOForm({
                        article_number: db.stockMaster[0].article_number,
                        order_quantity_units: db.stockMaster[0].order_volume,
                        lead_time_days: db.stockMaster[0].lead_time_days
                      });
                      setQuantityError('');
                      setIsManualPOModalOpen(true);
                    } else {
                      alert("No stock master items available to create a PO. Please add items or import them first.");
                    }
                    setIsFabOpen(false);
                  }}
                  className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-800 rounded-full border border-slate-200/80 shadow-lg flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/20 active:scale-95 cursor-pointer"
                  title="Create Manual Purchase Order"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                </button>
              </div>

              {/* Action 2: Run Stocktaking */}
              <div className="flex items-center gap-2">
                <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm font-sans whitespace-nowrap">
                  Run Stocktaking
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('scanner');
                    setIsFabOpen(false);
                  }}
                  className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-800 rounded-full border border-slate-200/80 shadow-lg flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/20 active:scale-95 cursor-pointer"
                  title="Go to Barcode Stocktaking"
                >
                  <Barcode className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              {/* Action 3: Export Filtered Inventory */}
              <div className="flex items-center gap-2">
                <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm font-sans whitespace-nowrap">
                  Export Inventory
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleExportToExcel();
                    setIsFabOpen(false);
                  }}
                  className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-800 rounded-full border border-slate-200/80 shadow-lg flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/20 active:scale-95 cursor-pointer"
                  title="Export Currently Filtered Inventory to Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                </button>
              </div>

              {/* Action 4: Export Purchase Orders */}
              <div className="flex items-center gap-2">
                <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm font-sans whitespace-nowrap">
                  Export POs
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleExportCreatedPOs();
                    setIsFabOpen(false);
                  }}
                  className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-800 rounded-full border border-slate-200/80 shadow-lg flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/20 active:scale-95 cursor-pointer"
                  title="Export All Created Purchase Orders to Excel"
                >
                  <History className="w-4 h-4 text-purple-600" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Floating Trigger Button */}
        <button
          type="button"
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-14 h-14 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-full shadow-2xl flex items-center justify-center transition-all duration-250 focus:outline-none focus:ring-4 focus:ring-amber-500/25 active:scale-95 z-50 relative cursor-pointer ${
            isFabOpen ? 'rotate-135 bg-slate-800 hover:bg-slate-900 text-white ring-4 ring-slate-800/10' : ''
          }`}
          title="Toggle Quick Actions Menu"
        >
          <Plus className="w-6 h-6 transition-transform duration-250" />
        </button>
      </div>

      {/* MANAGE ITEM PHOTO MODAL */}
      {activePhotoModalArticle && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 font-display">Manage Item Photo</h3>
                <p className="text-[11px] text-slate-500 font-mono">{activePhotoModalArticle.article_number} — {activePhotoModalArticle.description}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopPhotoCamera();
                  setStagedPhotoBase64(null);
                  setPhotoSuccessMsg(null);
                  setActivePhotoModalArticle(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {photoSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{photoSuccessMsg}</span>
                </div>
              )}

              {isCameraActive ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-200 shadow-inner">
                  <video ref={photoVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 flex gap-2">
                    <button
                      type="button"
                      onClick={snapPhotoFromCamera}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-1.5 text-xs transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Snap Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopPhotoCamera}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-lg shadow-lg text-xs transition cursor-pointer"
                    >
                      Cancel Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  {(stagedPhotoBase64 || activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url) ? (
                    <div className="relative group">
                      <img
                        src={stagedPhotoBase64 || activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url}
                        alt={activePhotoModalArticle.description}
                        className="w-44 h-44 object-cover rounded-xl border border-slate-300 shadow-md cursor-pointer"
                        onClick={() => setLightboxImageUrl(stagedPhotoBase64 || activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url || null)}
                        title="Click to expand view"
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxImageUrl(stagedPhotoBase64 || activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url || null)}
                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition shadow"
                        title="Expand View"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-200/70 border border-slate-300 flex items-center justify-center text-slate-400">
                      <Camera className="w-10 h-10" />
                    </div>
                  )}

                  <div className="text-center space-y-1">
                    {stagedPhotoBase64 ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Photo Uploaded (Ready to Save)
                      </span>
                    ) : (activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url) ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Photo Synced in Firebase DB
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">No Photo Attached</span>
                    )}
                    <p className="text-[10px] text-slate-400">Compressed & synchronized with Firestore database</p>
                  </div>
                </div>
              )}

              {!isCameraActive && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs p-2.5 rounded-lg transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      {(stagedPhotoBase64 || activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url) ? "Choose File" : "Upload File"}
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>

                    <button
                      type="button"
                      onClick={startPhotoCamera}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs p-2.5 rounded-lg transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Use Camera
                    </button>
                  </div>

                  {/* SAVE TO SERVER (FIREBASE DATABASE) BUTTON */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={!stagedPhotoBase64 || isSavingPhoto}
                      onClick={handleSavePhotoToFirebase}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md ${
                        stagedPhotoBase64 && !isSavingPhoto
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer ring-2 ring-emerald-400/50 shadow-lg animate-pulse'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <CloudUpload className="w-4 h-4" />
                      {isSavingPhoto ? "Saving to Firebase Database..." : "Save to Firebase Database"}
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-1">
                      {stagedPhotoBase64 
                        ? "Photo is staged! Click above to save permanently to Cloud Database." 
                        : "Upload a file or take a photo above to enable saving to Firebase Database."}
                    </p>
                  </div>
                </div>
              )}

              {(activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url || stagedPhotoBase64) && !isCameraActive && (
                <button
                  type="button"
                  onClick={handleDeletePhotoFromFirebase}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs p-2.5 rounded-lg border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Photo from Database
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX OVERLAY */}
      {lightboxImageUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImageUrl} alt="Expanded Lightbox View" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/10" />
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-400 text-2xl font-bold p-2 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}


  </>
  );
}
