'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';
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

export default function ScannerTab({ store }: { store: InventoryStore }) {
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
    <>        {/* TAB 3: BARCODE STOCKTAKING MODULE */}
        {activeTab === 'scanner' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Camera Scanner view finder */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-500" /> Scanner Viewfinder
                  </h3>
                  
                  {/* Real webcam toggler */}
                  <button
                    onClick={() => setUseCamera(!useCamera)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                      useCamera 
                        ? 'bg-amber-500 text-white border-amber-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {useCamera ? "Turn Camera Off" : "Use Real Camera"}
                  </button>
                </div>

                {/* Viewfinder simulation viewport */}
                <div className="aspect-video relative rounded-xl bg-slate-900 overflow-hidden border border-slate-800 flex flex-col items-center justify-center">
                  
                  {/* Real video if enabled */}
                  {useCamera ? (
                    <video 
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      muted
                    />
                  ) : (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-4">
                      <Barcode className="w-12 h-12 text-slate-700 animate-pulse mb-2" />
                      <div className="text-[11px] text-slate-400 font-mono">CAMERA SIMULATION STANDBY</div>
                      <div className="text-[9px] text-slate-500 max-w-xs mt-1">
                        Use the rapid demo buttons below to trigger scan beeps and fetch stock conversions!
                      </div>
                    </div>
                  )}

                  {/* Red animated scan lines & target markers */}
                  <div className="absolute inset-0 border-2 border-dashed border-amber-500/20 pointer-events-none flex items-center justify-center">
                    <div className="w-[80%] h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-[bounce_2s_infinite]"></div>
                  </div>

                  {/* Target frame overlay */}
                  <div className="absolute w-44 h-24 border-2 border-white/60 rounded-xl pointer-events-none"></div>

                  {/* Top-right floating state indicator */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {scannerStatus === 'scanning' && (
                      <span className="bg-amber-500 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded animate-pulse">
                        SCANNING...
                      </span>
                    )}
                    {scannerStatus === 'success' && (
                      <span className="bg-emerald-600 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                        MATCHED!
                      </span>
                    )}
                    {scannerStatus === 'error' && (
                      <span className="bg-red-600 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                        ERROR
                      </span>
                    )}
                  </div>
                </div>





                {/* Interactive Lookup Input Bar (Overlay) */}
                  <div className="bg-white/90 backdrop-blur-sm p-2 rounded-lg z-40 border border-slate-200">
                    <form onSubmit={handleManualBarcodeSubmit} className="flex gap-2">
                      <div className="relative flex-grow">
                        <input
                          type="text"
                          placeholder="Search item..."
                          value={scannedBarcode}
                          onChange={(e) => {
                            setScannedBarcode(e.target.value);
                            setFuzzyDropdownOpen(true);
                          }}
                          onFocus={() => setFuzzyDropdownOpen(true)}
                          className="w-full text-xs font-mono border border-slate-200 pl-8 pr-2 p-2 rounded-lg bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-700"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                      </div>
                      <button
                        type="submit"
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg transition shrink-0"
                      >
                        Lookup
                      </button>
                    </form>
                  </div>

                  {/* Suggestion Dropdown List (Positioned relative to the camera container) */}
                  {fuzzyDropdownOpen && scannedBarcode.trim().length > 0 && (
                    <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                      {(() => {
                        const suggestions = fuzzySearch(scannedBarcode, db.stockMaster);
                        if (suggestions.length === 0) {
                          return (
                            <div className="p-3 text-center text-xs text-slate-400 italic">
                              No matching articles found.
                            </div>
                          );
                        }
                        return suggestions.map(({ item, score }) => (
                          <button
                            key={item.article_number}
                            type="button"
                            onClick={() => {
                              handleSimulateScan(item.barcode);
                              setFuzzyDropdownOpen(false);
                            }}
                            className="w-full text-left p-2 hover:bg-amber-50/50 flex items-center gap-2 transition"
                          >
                            <div className="flex-grow min-w-0">
                              <div className="text-[9px] font-bold font-mono text-amber-700">{item.article_number}</div>
                              <div className="text-xs font-semibold text-slate-800 truncate">{item.description}</div>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}

                {/* Simulated Quick Scan Buttons (Excellent for review testing) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Delhi Station Demo Items (Click to Scan)</span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {db.stockMaster.map((item, index) => (
                      <button
                        key={`${item.article_number}-${index}`}
                        onClick={() => handleSimulateScan(item.barcode)}
                        className="text-left text-xs bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 p-2 rounded-lg transition flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-700">{item.description}</div>
                          <div className="text-[9px] text-slate-500 font-mono">Barcode: {item.barcode}</div>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-100">
                          {item.article_number}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Right Col: Calculation conversions and entry */}
            <div className="lg:col-span-7 space-y-4">
              <AnimatePresence mode="wait">
                {scannedArticle ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5"
                  >
                    <div className="flex items-start gap-4 border-b border-slate-100 pb-4">
                      {scannedArticle.image_url ? (
                        <img 
                          src={scannedArticle.image_url} 
                          alt={scannedArticle.description} 
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0"
                          onError={(e) => {
                            (e.target as any).src = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=150&auto=format&fit=crop&q=60";
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                          <Package className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-grow">
                        <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          {scannedArticle.article_number}
                        </span>
                        <h2 className="text-base font-bold text-slate-900 mt-1.5">{scannedArticle.description}</h2>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">Scanned Barcode: {scannedArticle.barcode}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-xs font-bold text-slate-700">Location: {scannedArticle.location || 'UNALLOCATED'}</span>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Smallest Unit</span>
                        <strong className="text-slate-800 text-sm font-semibold">{scannedArticle.smallest_unit_name}</strong>
                      </div>
                    </div>

                    {/* Packaging Hierarchy Specs & Free Text Specs Box */}
                    <div className="p-3 bg-amber-50/60 rounded-xl space-y-2 border border-amber-200/60">
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Boxes per Pack</span>
                          <strong className="text-slate-900 font-semibold">{scannedArticle.boxes_per_pack || 1} boxes</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Units per Box / Pad</span>
                          <strong className="text-slate-900 font-semibold">{scannedArticle.units_per_box || 1} {scannedArticle.smallest_unit_name}s</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Units per Pack</span>
                          <strong className="text-amber-800 font-bold">{((scannedArticle.boxes_per_pack ?? 1) * (scannedArticle.units_per_box ?? 1)).toLocaleString()} units</strong>
                        </div>
                      </div>

                      {/* Editable Quantity Free Text Spec & Remarks */}
                      <div className="border-t border-amber-200/60 pt-2 flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                            ✏️ Quantity & Packaging Spec (Editable Free Text):
                          </span>
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                            Editable
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={scannedArticle.quantity_details || ''}
                            onChange={(e) => setScannedArticle({ ...scannedArticle, quantity_details: e.target.value })}
                            placeholder="e.g. 1 Pack = 10 Boxes, 1 Box = 50 Sheets (or custom recount notes)"
                            className="flex-1 text-xs font-sans p-2 rounded-lg border border-amber-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updatedMaster = db.stockMaster.map(item => 
                                item.article_number === scannedArticle.article_number 
                                  ? { ...item, quantity_details: scannedArticle.quantity_details || '' } 
                                  : item
                              );
                              updateDb({ ...db, stockMaster: updatedMaster });
                              const updatedItem = updatedMaster.find(item => item.article_number === scannedArticle.article_number);
                              if (updatedItem) saveStockMasterToFirestore(updatedItem);
                              alert(`Updated Quantity Spec for Article ${scannedArticle.article_number}!`);
                            }}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
                            title="Save Quantity Free Text Spec directly to Stock Master"
                          >
                            <Save className="w-3 h-3" /> Save Spec
                          </button>
                        </div>
                        {scannedArticle.add_info && (
                          <p className="text-slate-600 text-[11px] italic pt-0.5">
                            💬 Remarks: {scannedArticle.add_info}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Current Stock info */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Storage Context</h4>
                      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-xs">
                        <span className="text-xs text-slate-500">Current Total Stock</span>
                        <span className="font-mono text-lg font-black text-slate-900">{(scannedArticle.total_stock_quantity ?? 0).toLocaleString()} units</span>
                      </div>
                    </div>

                    {/* Physical Count entry form */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span>1. Enter Recount Quantities</span>
                        </h4>
                      </div>

                      {/* Quantity Free Text Field in Recount Section */}
                      <div className="bg-white p-3 rounded-lg border border-amber-200/80 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            <span>Quantity & Packaging Free Text (Editable Spec & Recount Notes):</span>
                          </label>
                          <span className="text-[10px] text-amber-800 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Auto-saved on Stock Count submit
                          </span>
                        </div>
                        <input
                          type="text"
                          value={scannedArticle.quantity_details || ''}
                          onChange={(e) => setScannedArticle({ ...scannedArticle, quantity_details: e.target.value })}
                          placeholder="e.g. 1 Pack = 10 Boxes, 1 Box = 50 Sheets or custom unit recount notes"
                          className="w-full text-xs font-sans font-medium border border-slate-300 p-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900"
                        />
                        <p className="text-[10px] text-slate-400">
                          Edit free-text packaging spec or enter specific breakdown notes for this recount session.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Packs ({scannedArticle.boxes_per_pack || 1} boxes/pack)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={scanPacks || ''}
                            onChange={(e) => setScanPacks(Math.max(0, parseInt(e.target.value) || 0))}
                            placeholder="0"
                            className="w-full text-sm font-mono font-bold border border-slate-200 p-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="text-[10px] text-slate-400 block font-mono">
                            = {((scannedArticle.boxes_per_pack || 1) * (scannedArticle.units_per_box || 1)).toLocaleString()} units/pack
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Boxes / Pads ({scannedArticle.units_per_box || 1} units/box)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={scanBoxes || ''}
                            onChange={(e) => setScanBoxes(Math.max(0, parseInt(e.target.value) || 0))}
                            placeholder="0"
                            className="w-full text-sm font-mono font-bold border border-slate-200 p-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="text-[10px] text-slate-400 block font-mono">
                            = {scannedArticle.units_per_box || 1} units/box or pad
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Loose Units ({scannedArticle.smallest_unit_name || 'Piece'})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={scanUnits || ''}
                            onChange={(e) => setScanUnits(Math.max(0, parseInt(e.target.value) || 0))}
                            placeholder="0"
                            className="w-full text-sm font-mono font-bold border border-slate-200 p-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Individual loose units
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Formula disclosure for Unit Conversions */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">2. Live Normalization Formula Results</div>
                      
                      <div className="text-xs space-y-1 text-slate-600">
                        <div className="font-mono bg-white p-1 rounded border border-slate-100 text-[10.5px]">
                          Total Units = (Packs × {scannedArticle.boxes_per_pack} × {scannedArticle.units_per_box}) + (Boxes × {scannedArticle.units_per_box}) + Units
                        </div>
                        <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100 font-mono text-[11px]">
                          <span>Calculation: ({scanPacks} × {scannedArticle.boxes_per_pack * scannedArticle.units_per_box}) + ({scanBoxes} × {scannedArticle.units_per_box}) + {scanUnits}</span>
                          <strong className="text-amber-700 text-sm">
                            = {convertToSmallestUnits(scanPacks, scanBoxes, scanUnits, scannedArticle.units_per_box, scannedArticle.boxes_per_pack).toLocaleString()} units
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Discrepancy Real-time comparison */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">3. Live Expected Stock vs Recount Discrepancy</h4>
                      
                      {(() => {
                        const actualUnits = convertToSmallestUnits(
                          scanPacks,
                          scanBoxes,
                          scanUnits,
                          scannedArticle.units_per_box,
                          scannedArticle.boxes_per_pack
                        );
                        
                        const dailyBurn = calculateDailyBurnRate(scannedArticle.estimated_monthly_usage);
                        const expectedUnits = getExpectedStock(
                          scannedArticle.article_number,
                          simulatedDate,
                          db.stockTakingLog,
                          db.stockMaster,
                          dailyBurn
                        );

                        const diff = actualUnits - expectedUnits;

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Expected (Burn Estimated)</span>
                              <strong className="text-base font-mono text-slate-800">{(expectedUnits ?? 0).toLocaleString()}</strong>
                              <span className="text-[9px] text-slate-400 block mt-1">Based on last physical audit & {dailyBurn.toFixed(1)}/day burn</span>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Actual (Physical Recount)</span>
                              <strong className="text-base font-mono text-amber-700">{(actualUnits ?? 0).toLocaleString()}</strong>
                              <span className="text-[9px] text-slate-400 block mt-1">Sum of boxes/packs normalized</span>
                            </div>

                            <div className={`p-3 rounded-xl text-center border ${
                              diff === 0 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : diff > 0 
                                  ? 'bg-blue-50 border-blue-200 text-blue-800' 
                                  : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                              <span className="text-[10px] uppercase font-semibold block">Discrepancy</span>
                              <strong className="text-base font-mono">
                                {diff > 0 ? `+${(diff ?? 0).toLocaleString()}` : (diff ?? 0).toLocaleString()}
                              </strong>
                              <span className="text-[9px] font-bold block mt-1 uppercase">
                                {diff === 0 ? "Matched" : diff > 0 ? "Surplus (Overstock)" : "Deficit (Shrinkage)"}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
                      <button
                        onClick={() => {
                          setScannedArticle(null);
                          setScannedBarcode('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-4 py-2.5 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePhysicalCount}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm hover:shadow"
                      >
                        Save Count Log & Adjust Stock
                      </button>
                    </div>

                  </motion.div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm h-full flex flex-col items-center justify-center">
                    <Barcode className="w-16 h-16 text-slate-300 animate-pulse mb-3" />
                    <h3 className="font-bold text-slate-800 text-base">Awaiting Barcode Scan</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Scan an item barcode using your camera or click one of our **Delhi Station Quick Demo Items** on the left to simulate a physical handheld barcode scan!
                    </p>
                  </div>
                )}
              </AnimatePresence>

              {/* Log History list */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <History className="w-4 h-4 text-slate-500" /> Recent Stocktakes Log
                </h3>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {db.stockTakingLog.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No count audits registered yet.</p>
                  ) : (
                    db.stockTakingLog.map(log => {
                      const article = db.stockMaster.find(m => m.article_number === log.article_number);
                      return (
                        <div key={log.log_id} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-800">{article?.description || log.article_number}</strong>
                              <span className="font-mono text-[9px] bg-white px-1 border border-slate-100 rounded text-slate-500">
                                {log.article_number}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()} • Mode: {log.input_type}
                            </div>
                          </div>
                          
                          <div className="text-right font-mono">
                            <div>Count: <strong className="text-slate-800">{(log.actual_quantity_units ?? 0).toLocaleString()}</strong></div>
                            <div className={`text-[10px] font-bold ${
                              log.discrepancy_status === 'Matched' 
                                ? 'text-emerald-600' 
                                : log.discrepancy_status === 'Surplus' 
                                  ? 'text-blue-600' 
                                  : 'text-red-600'
                            }`}>
                              {log.discrepancy_units === 0 ? "Matched" : log.discrepancy_units > 0 ? `+${log.discrepancy_units}` : log.discrepancy_units}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

  </>
  );
}
