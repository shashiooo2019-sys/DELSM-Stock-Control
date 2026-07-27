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

export default function MasterTab({ store }: { store: InventoryStore }) {
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
    <>        {/* TAB 2: MASTER STOCK MANAGEMENT */}
        {activeTab === 'master' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Delhi Station Master Stock</h2>
                <p className="text-xs text-slate-500">Add, edit, and define unit conversions and thresholds for inventory parts.</p>
              </div>
              <div className="flex gap-2.5 self-start flex-wrap">
                <button
                  onClick={() => setIsBarcodeTagsModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm px-4 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer focus:outline-none"
                  title="Generate and print barcode tags for all inventory items"
                >
                  <Barcode className="w-4 h-4" /> Generate Bar Codes
                </button>
                <button
                  onClick={handleExportToExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5"
                  title="Export currently filtered table dataset to Excel / CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export to Excel
                </button>
                {selectedArticleNumbers.length > 0 && currentUser?.role === 'admin' && (
                  <button 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Delete button clicked, selected items:", selectedArticleNumbers);
                        console.log("Current user:", currentUser);
                        setConfirmDeleteModal({
                          isOpen: true,
                          type: 'bulk-articles',
                          id: '',
                          title: 'Delete Selected Articles',
                          description: `Are you sure you want to delete ${selectedArticleNumbers.length} selected articles? This will permanently remove their master specifications, shelf locations, stocktaking logs, and purchase orders.`
                        });
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer focus:outline-none"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Selected ({selectedArticleNumbers.length})
                  </button>
                )}
                {selectedArticleNumbers.length === 1 && currentUser?.role === 'admin' && (
                  <button
                    onClick={() => {
                        const article = db.stockMaster.find(m => m.article_number === selectedArticleNumbers[0]);
                        if(article) handleOpenEditModal(article);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5"
                  >
                    <Edit2 className="w-4 h-4" /> Edit Selected
                  </button>
                )}
                {currentUser?.role === 'admin' && (
                  <>
                    <button
                      onClick={() => setIsExcelImportModalOpen(true)}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Import from Excel
                    </button>
                    <button
                      onClick={handleOpenAddModal}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Master Item
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filters panel */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
              <div className="flex-grow min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search description, ID, barcode, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm border border-slate-200 p-2 pl-9 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>

              <div className="flex gap-2.5 flex-wrap items-center">
                {/* Location Filter */}
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-700 font-medium cursor-pointer"
                >
                  <option value="All">All Locations ({uniqueLocations.length})</option>
                  {uniqueLocations.map(loc => (
                    <option key={loc} value={loc}>
                      {loc === 'UNALLOCATED' ? '⚠️ Unallocated Location' : `📍 ${loc}`}
                    </option>
                  ))}
                </select>

                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-700 cursor-pointer"
                >
                  <option value="All">All Channels</option>
                  <option value="Central">Central Ordering Only</option>
                  <option value="Local">Local Only</option>
                </select>

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-700 cursor-pointer"
                >
                  <option value="All">All Stock Levels</option>
                  <option value="Healthy">🟢 Healthy</option>
                  <option value="Low">🟡 Low</option>
                  <option value="Action Needed">🔴 Action Needed</option>
                  <option value="Suppressed">⏳ Suppressed</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 ml-auto">
                  <button
                    onClick={() => setStockViewMode('gallery')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      stockViewMode === 'gallery'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Gallery Cards View with Article Pictures & Status Markers"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Gallery
                  </button>
                  <button
                    onClick={() => setStockViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      stockViewMode === 'table'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Standard Data Grid Table View"
                  >
                    <List className="w-3.5 h-3.5" /> Table
                  </button>
                  <button
                    onClick={() => setStockViewMode('grouped')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      stockViewMode === 'grouped'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Group Stock by Location"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Group by Location
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Bar */}
            {(searchQuery || channelFilter !== 'All' || stockFilter !== 'All' || locationFilter !== 'All') && (
              <div className="bg-slate-50 border border-slate-200 p-2 px-4 rounded-lg flex items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-bold text-slate-500 uppercase tracking-wider mr-1">Active Filters:</span>
                  {searchQuery && (
                    <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      Search: {searchQuery}
                    </span>
                  )}
                  {locationFilter !== 'All' && (
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      Location: {locationFilter}
                    </span>
                  )}
                  {channelFilter !== 'All' && (
                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      Channel: {channelFilter === 'Central' ? 'Central Ordering Team' : channelFilter}
                    </span>
                  )}
                  {stockFilter !== 'All' && (
                    <span className={`px-2 py-1 rounded-full font-medium flex items-center gap-1 ${
                      stockFilter === 'Action Needed' ? 'bg-red-100 text-red-800' :
                      stockFilter === 'Suppressed' ? 'bg-amber-100 text-amber-800' :
                      stockFilter === 'Low' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      Status: {stockFilter}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setChannelFilter('All');
                    setStockFilter('All');
                    setLocationFilter('All');
                  }}
                  className="shrink-0 font-bold text-[11px] bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded transition cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}

             {selectedArticleNumbers.length > 0 && (
               <div className="flex items-center gap-4 p-4 bg-amber-50 border-t border-b border-amber-200">
                 <span className="text-xs font-bold text-amber-800">Bulk Edit ({selectedArticleNumbers.length}):</span>
                 <button className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 cursor-pointer" onClick={() => {
                     setConfirmDeleteModal({
                       isOpen: true,
                       type: 'bulk-articles',
                       id: 'bulk',
                       title: 'Bulk Delete Articles',
                       description: `Are you sure you want to delete ${selectedArticleNumbers.length} selected articles?`
                     });
                 }}>Delete Selected</button>
               </div>
             )}

            {/* Render View: Gallery Cards vs Grouped by Location vs Data Grid Table */}
            {stockViewMode === 'gallery' ? (
              <div className="space-y-4">
                {filteredArticles.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-700">No stock articles found</h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans">Try adjusting your search query or filter options.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredArticles.map((article, index) => {
                      const photoSrc = article.image_base64 || article.image_url;
                      const isSelected = selectedArticleNumbers.includes(article.article_number);
                      
                      // Status marker color calculation:
                      // Green: Healthy stock
                      // Yellow: Low stock or Suppressed (PO in transit)
                      // Red: Action Needed / Critical low / Out of stock
                      let statusBadgeText = '🟢 Healthy Stock';
                      let borderAccent = 'border-t-emerald-500 hover:border-emerald-600';
                      let bgCard = 'bg-white';
                      let badgeBg = 'bg-emerald-500 text-white border-emerald-400';
                      let stockTextCol = 'text-emerald-700';

                      if (article.statusLabel === 'Action Needed' || article.currentStock <= article.min_quantity || article.currentStock === 0) {
                        statusBadgeText = '🔴 Action Needed';
                        borderAccent = 'border-t-red-500 hover:border-red-600';
                        bgCard = 'bg-red-50/20';
                        badgeBg = 'bg-red-600 text-white border-red-500 animate-pulse';
                        stockTextCol = 'text-red-700';
                      } else if (article.statusLabel === 'Suppressed') {
                        statusBadgeText = '⏳ Suppressed (PO Active)';
                        borderAccent = 'border-t-amber-500 hover:border-amber-600';
                        bgCard = 'bg-amber-50/20';
                        badgeBg = 'bg-amber-500 text-white border-amber-400';
                        stockTextCol = 'text-amber-800';
                      } else if (article.statusLabel === 'Low' || article.currentStock <= article.reorder_level) {
                        statusBadgeText = '🟡 Low Stock';
                        borderAccent = 'border-t-amber-500 hover:border-amber-600';
                        bgCard = 'bg-amber-50/20';
                        badgeBg = 'bg-amber-500 text-white border-amber-400';
                        stockTextCol = 'text-amber-700';
                      }

                      // Gauge percentage
                      const maxTarget = Math.max(article.max_quantity || 1, article.reorder_level || 1, 1);
                      const pct = Math.min(100, Math.round((article.currentStock / maxTarget) * 100));

                      return (
                        <div 
                          key={`gallery-${article.article_number}-${index}`}
                          className={`group border border-slate-200 border-t-4 ${borderAccent} rounded-2xl ${bgCard} shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden relative`}
                        >
                          <div>
                            {/* Top Picture Container */}
                            <div className="relative h-44 w-full bg-slate-900 overflow-hidden flex items-center justify-center group/img">
                              {photoSrc ? (
                                <img 
                                  src={photoSrc} 
                                  alt={article.description} 
                                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as any).src = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&auto=format&fit=crop&q=80";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
                                  <Package className="w-10 h-10 text-slate-600 mb-1" />
                                  <span className="text-[11px] text-slate-400 font-medium">No Image Available</span>
                                </div>
                              )}

                              {/* Dark gradient overlay for text readability */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                              {/* Bulk Checkbox Overlay */}
                              <div className="absolute top-2.5 left-2.5 z-10">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      setSelectedArticleNumbers([...selectedArticleNumbers, article.article_number]);
                                    } else {
                                      setSelectedArticleNumbers(selectedArticleNumbers.filter(num => num !== article.article_number));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer shadow-xs bg-white/90"
                                />
                              </div>

                              {/* Color-Coded Health Status Marker (Green, Yellow, or Red) */}
                              <div className="absolute top-2.5 right-2.5 z-10">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 border ${badgeBg}`}>
                                  {statusBadgeText}
                                </span>
                              </div>

                              {/* Photo & Camera trigger overlay */}
                              <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePhotoModalArticle(article);
                                    startPhotoCamera();
                                  }}
                                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 transition border border-amber-300 cursor-pointer active:scale-95"
                                  title="Activate device camera to take live item photo"
                                >
                                  <Camera className="w-3 h-3 text-slate-950" />
                                  <span>Camera</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePhotoModalArticle(article);
                                  }}
                                  className="bg-black/70 hover:bg-black text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 transition border border-white/20 cursor-pointer"
                                  title={photoSrc ? "View or edit stored photo" : "Upload or manage photo"}
                                >
                                  {photoSrc ? "View Photo" : "+ Add"}
                                </button>
                              </div>

                              {/* Location tag overlay */}
                              <div className="absolute bottom-2.5 left-2.5 z-10 max-w-[65%] truncate">
                                <span className="bg-slate-900/80 backdrop-blur-xs text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-bold font-mono flex items-center gap-1 truncate">
                                  <MapPin className="w-2.5 h-2.5 shrink-0 text-indigo-400" />
                                  <span className="truncate">{article.location || 'UNALLOCATED'}</span>
                                </span>
                              </div>
                            </div>

                            {/* Card Content Body */}
                            <div className="p-4 space-y-3">
                              {/* Article Number Header & Barcode */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 tracking-wide">
                                  Art #{article.article_number}
                                </span>
                                {article.barcode && (
                                  <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                                    <Barcode className="w-3 h-3 text-slate-400" />
                                    {article.barcode}
                                  </span>
                                )}
                              </div>

                              {/* Item Description */}
                              <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug hover:text-amber-600 transition" title={article.description}>
                                {article.description}
                              </h4>

                              {/* Prominent Quantity In Stock Display */}
                              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">In Stock Quantity</span>
                                  <div className="text-right">
                                    <span className={`font-mono text-2xl font-black ${stockTextCol}`}>
                                      {article.currentStock.toLocaleString()}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500 ml-1">
                                      {article.smallest_unit_name || 'units'}
                                    </span>
                                  </div>
                                </div>

                                {/* Free Text Quantity Details or Notes */}
                                {(article.quantity_details || article.add_info) && (
                                  <div className="text-[11px] text-slate-600 font-sans border-t border-slate-200/60 pt-1.5 flex flex-col gap-0.5">
                                    {article.quantity_details && (
                                      <p className="line-clamp-1 font-medium text-slate-700">📦 {article.quantity_details}</p>
                                    )}
                                    {article.add_info && (
                                      <p className="line-clamp-1 italic text-slate-500 text-[10px]">💬 {article.add_info}</p>
                                    )}
                                  </div>
                                )}

                                {/* Stock Gauge Progress Bar */}
                                <div className="space-y-1 pt-0.5">
                                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                                    <div 
                                      className={`h-full transition-all duration-300 ${
                                        stockTextCol.includes('red') ? 'bg-red-500' :
                                        stockTextCol.includes('amber') ? 'bg-amber-500' :
                                        'bg-emerald-500'
                                      }`}
                                      style={{ width: `${Math.max(5, pct)}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                                    <span>Min: {article.min_quantity}</span>
                                    <span>Reorder: {article.reorder_level}</span>
                                    <span>Max: {article.max_quantity}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(article)}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Edit Stock Item"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteModal({
                                  isOpen: true,
                                  type: 'article',
                                  id: article.article_number,
                                  title: 'Delete Article',
                                  description: `Are you sure you want to delete article ${article.article_number} (${article.description})?`
                                })}
                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                title="Delete Article"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleQuickOrder(article)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                stockTextCol.includes('red')
                                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                                  : stockTextCol.includes('amber')
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : 'bg-slate-800 hover:bg-slate-900 text-white'
                              }`}
                              title="Create Purchase Order for this item"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              {stockTextCol.includes('red') ? 'Reorder Now' : 'Quick PO'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : stockViewMode === 'grouped' ? (
              <div className="space-y-6">
                {articlesByLocation.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                    <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No matching stock articles found for the selected location filter.
                  </div>
                ) : (
                  articlesByLocation.map((group) => {
                    const isCollapsed = collapsedLocations[group.location];
                    const allSelected = group.articles.length > 0 && group.articles.every(a => selectedArticleNumbers.includes(a.article_number));

                    return (
                      <div key={group.location} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Group Header */}
                        <div 
                          onClick={() => setCollapsedLocations(prev => ({ ...prev, [group.location]: !prev[group.location] }))}
                          className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-800 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${group.location === 'UNALLOCATED' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-300'}`}>
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
                                {group.location === 'UNALLOCATED' ? '⚠️ UNALLOCATED LOCATION' : group.location}
                                <span className="text-[10px] font-mono bg-white/10 px-2.5 py-0.5 rounded-full text-slate-300 font-normal">
                                  {group.articles.length} {group.articles.length === 1 ? 'item' : 'items'}
                                </span>
                              </h3>
                              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                Total Stock Quantity: <span className="text-amber-400 font-bold">{group.totalUnits.toLocaleString()}</span> units
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-semibold">
                              {isCollapsed ? 'Expand Location' : 'Collapse Location'}
                            </span>
                            {isCollapsed ? (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Location Articles Table */}
                        {!isCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                                  <th className="p-4 w-10">
                                    <input 
                                      type="checkbox"
                                      checked={allSelected}
                                      onChange={(e) => {
                                        const locNums = group.articles.map(a => a.article_number);
                                        if (e.target.checked) {
                                          setSelectedArticleNumbers(Array.from(new Set([...selectedArticleNumbers, ...locNums])));
                                        } else {
                                          setSelectedArticleNumbers(selectedArticleNumbers.filter(num => !locNums.includes(num)));
                                        }
                                      }}
                                    />
                                  </th>
                                  <th className="p-4 text-center w-20">Item Photo</th>
                                  <th className="p-4">Article & Details</th>
                                  <th className="p-4">Barcode</th>
                                  <th className="p-4">Packaging Hierarchy</th>
                                   <th className="p-4">Quantity Details</th>
                                   <th className="p-4">Add Info</th>
                                   <th className="p-4">Consumption</th>
                                  <th className="p-4">Threshold Limits</th>
                                  <th className="p-4">Ordering Route</th>
                                  <th className="p-4 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {group.articles.map((article, index) => (
                                  <tr key={`${article.article_number}-${index}`} className="hover:bg-slate-50/80 transition">
                                    <td className="p-4">
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
                                    <td className="p-4 text-center">
                                      {(article.image_url || article.image_base64) ? (
                                        <div 
                                          className="relative group/tblimg w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-2xs mx-auto cursor-pointer"
                                          onClick={() => setActivePhotoModalArticle(article)}
                                          title="Click to view or edit photo"
                                        >
                                          <img 
                                            src={article.image_url || article.image_base64} 
                                            alt={article.description} 
                                            className="w-full h-full object-cover group-hover/tblimg:scale-110 transition duration-200"
                                            onError={(e) => {
                                              (e.target as any).src = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=150&auto=format&fit=crop&q=60";
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/tblimg:opacity-100 flex items-center justify-center transition text-white">
                                            <Camera className="w-4 h-4" />
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setActivePhotoModalArticle(article)}
                                          className="w-12 h-12 rounded-lg bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 transition cursor-pointer mx-auto"
                                          title="Upload image for this item"
                                        >
                                          <Camera className="w-4 h-4" />
                                          <span className="text-[8px] font-bold mt-0.5">+ Image</span>
                                        </button>
                                      )}
                                    </td>
                                    <td className="p-4 max-w-sm">
                                      <div className="flex items-start gap-3">
                                        {article.image_url ? (
                                          <img 
                                            src={article.image_url} 
                                            alt={article.description} 
                                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 mt-0.5"
                                            onError={(e) => {
                                              (e.target as any).src = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=150&auto=format&fit=crop&q=60";
                                            }}
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 mt-0.5">
                                            <Package className="w-6 h-6 text-slate-400" />
                                          </div>
                                        )}
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                              {article.article_number}
                                            </span>
                                            <span className="font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5">
                                              <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                                              {article.location || 'UNALLOCATED'}
                                            </span>
                                            {article.statusLabel === 'Action Needed' && (
                                              <button
                                                onClick={() => setStockFilter('Action Needed')}
                                                className="bg-red-100 hover:bg-red-200 text-red-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full cursor-pointer transition focus:outline-none"
                                                title="Filter by Action Needed"
                                              >
                                                ALERT
                                              </button>
                                            )}
                                            {article.statusLabel === 'Suppressed' && (
                                              <button
                                                onClick={() => setStockFilter('Suppressed')}
                                                className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full cursor-pointer transition focus:outline-none"
                                                title="Filter by Suppressed (Approved)"
                                              >
                                                SUPPRESSED
                                              </button>
                                            )}
                                          </div>
                                          <span className="font-bold text-slate-800 text-sm block">
                                            {article.description}
                                          </span>
                                          <div className="text-[11px] text-slate-500">
                                            Current Stock: <strong className="font-mono text-slate-700">
                                              {(article.currentStock ?? 0).toLocaleString()} {article.smallest_unit_name}s
                                            </strong>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-slate-600">
                                      <div className="flex items-center gap-1.5">
                                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{article.barcode}</span>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="space-y-0.5">
                                        <div>1 Pack = {article.boxes_per_pack} Boxes</div>
                                        <div>1 Box = {article.units_per_box} {article.smallest_unit_name}s</div>
                                        <div className="font-semibold text-amber-700">
                                          Total Pack: {(article.boxes_per_pack * article.units_per_box).toLocaleString()} {article.smallest_unit_name}s
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="font-mono text-slate-700">{article.quantity_details || <span className="text-slate-300 italic">N/A</span>}</div>
                                    </td>
                                    <td className="p-4">
                                      <div className="text-slate-700">{article.add_info || <span className="text-slate-300 italic">N/A</span>}</div>
                                    </td>
                                    <td className="p-4">
                                      <div className="space-y-0.5">
                                        <div>Monthly: <strong>{(article.estimated_monthly_usage ?? 0).toLocaleString()}</strong></div>
                                        <div className="text-slate-500">Burn: {article.dailyBurn.toFixed(1)}/day</div>
                                      </div>
                                    </td>
                                    <td className="p-4 font-mono">
                                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                        <span className="text-slate-400">Min:</span> <span className="font-bold text-slate-700">{article.min_quantity}</span>
                                        <span className="text-slate-400">Reorder:</span> <span className="font-bold text-red-600">{(article.reorder_level ?? 0).toLocaleString()}</span>
                                        <span className="text-slate-400">Max:</span> <span className="font-bold text-slate-700">{article.max_quantity}</span>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <button
                                        onClick={() => {
                                          const route = article.ordering_channel === 'Local' ? 'Local' : 'Central';
                                          setChannelFilter(channelFilter === route ? 'All' : route);
                                        }}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] cursor-pointer hover:opacity-80 transition focus:outline-none ${
                                          article.ordering_channel === 'Local' 
                                            ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                                            : 'bg-blue-50 text-blue-800 border border-blue-100'
                                        } ${channelFilter === (article.ordering_channel === 'Local' ? 'Local' : 'Central') ? 'ring-2 ring-amber-500' : ''}`}
                                        title={`Click to filter by ${article.ordering_channel} route`}
                                      >
                                        <Truck className="w-3 h-3" />
                                        {article.ordering_channel === 'Local' ? 'Local' : 'Central Ordering Team'}
                                      </button>
                                      <div className="text-[10px] text-slate-400 mt-1">Lead-time: {article.lead_time_days} days</div>
                                    </td>
                                    <td className="p-4 text-right">
                                      <div className="flex justify-end gap-1">
                                        {currentUser?.role === 'admin' && (
                                          <>
                                            <button
                                              onClick={() => handleOpenEditModal(article)}
                                              className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                              title="Edit Item Details"
                                            >
                                              <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteArticle(article.article_number)}
                                              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                              title="Delete Item"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Data Grid table */
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                        <th className="p-4 w-10">
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
                        <th className="p-4 text-center w-20">Item Photo</th>
                        <th className="p-4">Article & Details</th>
                        <th className="p-4">Barcode</th>
                        <th className="p-4">Packaging Hierarchy</th>
                        <th className="p-4">Quantity Details</th>
                        <th className="p-4">Remarks / Add Info</th>
                        <th className="p-4">Consumption</th>
                        <th className="p-4">Threshold Limits</th>
                        <th className="p-4">Ordering Route</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredArticles.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-slate-400">
                            No matching stock articles found.
                          </td>
                        </tr>
                      ) : (
                        filteredArticles.map((article, index) => (
                          <tr key={`${article.article_number}-${index}`} className="hover:bg-slate-50/80 transition">
                            <td className="p-4">
                              <input
                                type="checkbox"
                                checked={selectedArticleNumbers.includes(article.article_number)}
                                onChange={(e) => {
                                  console.log("Checkbox changed for:", article.article_number, "checked:", e.target.checked);
                                  if (e.target.checked) {
                                    setSelectedArticleNumbers([...selectedArticleNumbers, article.article_number]);
                                  } else {
                                    setSelectedArticleNumbers(selectedArticleNumbers.filter(num => num !== article.article_number));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-4 text-center">
                              {(article.image_url || article.image_base64) ? (
                                <div 
                                  className="relative group/tblimg w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-2xs mx-auto cursor-pointer"
                                  onClick={() => setActivePhotoModalArticle(article)}
                                  title="Click to view or edit photo"
                                >
                                  <img 
                                    src={article.image_url || article.image_base64} 
                                    alt={article.description} 
                                    className="w-full h-full object-cover group-hover/tblimg:scale-110 transition duration-200"
                                    onError={(e) => {
                                      (e.target as any).src = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=150&auto=format&fit=crop&q=60";
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/tblimg:opacity-100 flex items-center justify-center transition text-white">
                                    <Camera className="w-4 h-4" />
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActivePhotoModalArticle(article)}
                                  className="w-12 h-12 rounded-lg bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 transition cursor-pointer mx-auto"
                                  title="Upload image for this item"
                                >
                                  <Camera className="w-4 h-4" />
                                  <span className="text-[8px] font-bold mt-0.5">+ Image</span>
                                </button>
                              )}
                            </td>
                            <td className="p-4 max-w-sm">
                              <div className="flex items-start gap-3">
                                {article.image_url ? (
                                  <img 
                                    src={article.image_url} 
                                    alt={article.description} 
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 mt-0.5"
                                    onError={(e) => {
                                      (e.target as any).src = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=150&auto=format&fit=crop&q=60";
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 mt-0.5">
                                    <Package className="w-6 h-6 text-slate-400" />
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                      {article.article_number}
                                    </span>
                                    <span className="font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5">
                                      <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                                      {article.location || 'UNALLOCATED'}
                                    </span>
                                    {article.statusLabel === 'Action Needed' && (
                                      <button
                                        onClick={() => {
                                          setStockFilter('Action Needed');
                                        }}
                                        className="bg-red-100 hover:bg-red-200 text-red-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full cursor-pointer transition focus:outline-none"
                                        title="Filter by Action Needed"
                                      >
                                        ALERT
                                      </button>
                                    )}
                                    {article.statusLabel === 'Suppressed' && (
                                      <button
                                        onClick={() => {
                                          setStockFilter('Suppressed');
                                        }}
                                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full cursor-pointer transition focus:outline-none"
                                        title="Filter by Suppressed (Approved)"
                                      >
                                        SUPPRESSED
                                      </button>
                                    )}
                                  </div>
                                <span className="font-bold text-slate-800 text-sm block">
                                  {article.description}
                                </span>
                                  <div className="text-[11px] text-slate-500">
                                    Current Stock: <strong className="font-mono text-slate-700">
                                      {(article.currentStock ?? 0).toLocaleString()} {article.smallest_unit_name}s
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Barcode className="w-3.5 h-3.5 text-slate-400" />
                                <span>{article.barcode}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-0.5">
                                <div>1 Pack = {article.boxes_per_pack} Boxes</div>
                                <div>1 Box = {article.units_per_box} {article.smallest_unit_name}s</div>
                                <div className="font-semibold text-amber-700">
                                  Total Pack: {(article.boxes_per_pack * article.units_per_box).toLocaleString()} {article.smallest_unit_name}s
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-mono text-slate-700">{article.quantity_details || <span className="text-slate-300 italic">N/A</span>}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-slate-700">{article.add_info || <span className="text-slate-300 italic">N/A</span>}</div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-0.5">
                                <div>Monthly: <strong>{(article.estimated_monthly_usage ?? 0).toLocaleString()}</strong></div>
                                <div className="text-slate-500">Burn: {article.dailyBurn.toFixed(1)}/day</div>
                              </div>
                            </td>
                            <td className="p-4 font-mono">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                <span className="text-slate-400">Min:</span> <span className="font-bold text-slate-700">{article.min_quantity}</span>
                                <span className="text-slate-400">Reorder:</span> <span className="font-bold text-red-600">{(article.reorder_level ?? 0).toLocaleString()}</span>
                                <span className="text-slate-400">Max:</span> <span className="font-bold text-slate-700">{article.max_quantity}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => {
                                  const route = article.ordering_channel === 'Local' ? 'Local' : 'Central';
                                  setChannelFilter(channelFilter === route ? 'All' : route);
                                }}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] cursor-pointer hover:opacity-80 transition focus:outline-none ${
                                  article.ordering_channel === 'Local' 
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                                    : 'bg-blue-50 text-blue-800 border border-blue-100'
                                } ${channelFilter === (article.ordering_channel === 'Local' ? 'Local' : 'Central') ? 'ring-2 ring-amber-500' : ''}`}
                                title={`Click to filter by ${article.ordering_channel} route`}
                              >
                                <Truck className="w-3 h-3" />
                                {article.ordering_channel === 'Local' ? 'Local' : 'Central Ordering Team'}
                              </button>
                              <div className="text-[10px] text-slate-400 mt-1">Lead-time: {article.lead_time_days} days</div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-1">
                                {currentUser?.role === 'admin' && (
                                  <>
                                    <button
                                      onClick={() => handleOpenEditModal(article)}
                                      className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                                      title="Edit Item Details"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteArticle(article.article_number)}
                                      className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                      title="Delete Item"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

  </>
  );
}
