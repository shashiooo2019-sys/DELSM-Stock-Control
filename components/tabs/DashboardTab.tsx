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

export default function DashboardTab({ store }: { store: InventoryStore }) {
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
    <>        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* STICKY TOP NAVIGATION BAR FOR STRICT SECTION FILTERING */}
            <div className="sticky top-0 bg-[#EDF2F7] py-3 z-30 shadow-xs border-b border-slate-200/50 -mx-6 px-6 shrink-0 mb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  <button
                    onClick={() => setStockFilter('Action Needed')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      stockFilter === 'Action Needed'
                        ? 'bg-red-600 border-red-700 text-white shadow-inner scale-[0.98]'
                        : 'bg-white hover:bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <span>🔴 Action Needed</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black font-mono ${stockFilter === 'Action Needed' ? 'bg-red-800 text-white' : 'bg-red-100 text-red-800'}`}>
                      {kpis.actionNeeded}
                    </span>
                  </button>

                  <button
                    onClick={() => setStockFilter('Suppressed')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      stockFilter === 'Suppressed'
                        ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-inner scale-[0.98]'
                        : 'bg-white hover:bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <span>🟡 Approved / Suppressed</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black font-mono ${stockFilter === 'Suppressed' ? 'bg-amber-700 text-amber-950' : 'bg-amber-100 text-amber-800'}`}>
                      {kpis.suppressed}
                    </span>
                  </button>

                  <button
                    onClick={() => setStockFilter('Healthy')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      stockFilter === 'Healthy'
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-inner scale-[0.98]'
                        : 'bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <span>🟢 Healthy Stock</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black font-mono ${stockFilter === 'Healthy' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                      {kpis.healthy}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setStockFilter('All');
                      setSearchQuery('');
                      setChannelFilter('All');
                      setLocationFilter('All');
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                  >
                    🧹 CLEAR FILTERS
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0 justify-end w-full lg:w-auto flex-wrap">
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-300 p-2.5 rounded-xl text-slate-700 font-bold cursor-pointer shadow-xs"
                  >
                    <option value="All">All Locations ({uniqueLocations.length})</option>
                    {uniqueLocations.map(loc => (
                      <option key={loc} value={loc}>
                        {loc === 'UNALLOCATED' ? '⚠️ Unallocated Location' : `📍 ${loc}`}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleExportToExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5 w-full sm:w-auto justify-center cursor-pointer"
                    title="Export currently filtered table dataset to Excel / CSV"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Export Filtered View to Excel
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Procurement & Smart Suppression Alerts</h2>
                <p className="text-xs text-slate-500">Live evaluation of Delhi Station inventory level (Q_current) against critical threshold (Q_current &le; reorder_level).</p>
              </div>
            </div>

            {/* Active Filter Bar */}
            {(searchQuery || channelFilter !== 'All' || stockFilter !== 'All' || locationFilter !== 'All') && (
              <div className="bg-slate-50 border border-slate-200 p-2 px-4 rounded-lg flex items-center justify-between gap-4 shadow-sm mb-6">
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
                      <button onClick={() => setLocationFilter('All')} className="hover:text-red-600 ml-1 font-bold cursor-pointer">✕</button>
                    </span>
                  )}
                  {channelFilter !== 'All' && (
                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      Channel: {channelFilter === 'Central' ? 'Central Ordering Team' : channelFilter}
                      <button onClick={() => setChannelFilter('All')} className="hover:text-red-600 ml-1 font-bold cursor-pointer">✕</button>
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
                      <button onClick={() => setStockFilter('All')} className="hover:text-red-600 ml-1 font-bold cursor-pointer">✕</button>
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

            <div className="grid grid-cols-1 gap-6">
              
              {/* 1. CRITICAL: ACTION NEEDED PANEL (Red alert trigger) */}
              {(stockFilter === 'All' || stockFilter === 'Action Needed') && (
                <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-red-50 px-5 py-4 border-b border-red-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <h3 className="font-bold text-sm uppercase tracking-wider">🔴 Action Needed: Reorder Trigger Met</h3>
                    </div>
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-md font-bold">
                      No Active PO Exists
                    </span>
                  </div>
                  
                  <div className="divide-y divide-slate-100">
                  {filteredArticles.filter(a => a.statusLabel === 'Action Needed' || a.statusLabel === 'Low').length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm">Great news! No matching stock items require active procurement attention.</p>
                    </div>
                  ) : (
                    filteredArticles.filter(a => a.statusLabel === 'Action Needed' || a.statusLabel === 'Low').map((article, index) => (
                      <div key={`${article.article_number}-${index}`} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50 transition">
                        <div className="space-y-2 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded">
                              {article.article_number}
                            </span>
                            <span className="font-bold text-slate-800 text-left">
                              {article.description}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2 text-xs">
                            <div>
                              <div className="text-slate-400">Current Stock</div>
                              <div className="font-bold text-red-600 font-mono">
                                {(article.currentStock ?? 0).toLocaleString()} {article.smallest_unit_name}s
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400">Reorder Level</div>
                              <div className="font-bold text-slate-700 font-mono">
                                {(article.reorder_level ?? 0).toLocaleString()} {article.smallest_unit_name}s
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400">Daily Burn Rate</div>
                              <div className="font-bold text-slate-700 font-mono">
                                {article.dailyBurn.toFixed(1)} / day
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400 font-mono text-[10px]">Min / Max</div>
                              <div className="font-bold text-slate-700 font-mono">
                                {article.min_quantity} / {article.max_quantity}
                              </div>
                            </div>
                          </div>

                          {article.suppression.aheadOfSchedule && (
                            <div className="text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded-lg text-xs flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              <span>
                                <strong>Reordering Ahead of Schedule</strong>: Time since last PO is less than expected cycle length ({article.order_frequency_days} days).
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Order Placement Form block */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center gap-4">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Standard Volume</div>
                            <div className="text-sm font-mono font-bold text-slate-700">{(article.order_volume ?? 0).toLocaleString()} units</div>
                            <div className="text-[10px] text-slate-500">Lead time: {article.lead_time_days}d ({article.ordering_channel})</div>
                          </div>
                          <button
                            onClick={() => handleQuickOrder(article)}
                            className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" /> Place PO Now
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

              {/* 2. SMART IN-TRANSIT & SUPPRESSED ORDERS PANEL (Yellow badge suppression) */}
              {(stockFilter === 'All' || stockFilter === 'Suppressed') && (
                <div className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-amber-50 px-5 py-4 border-b border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Truck className="w-5 h-5 text-amber-500" />
                      <h3 className="font-bold text-sm uppercase tracking-wider">🟡 Suppressed Alerts: Active Orders Approved</h3>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-md font-bold">
                      Reorder Alert Suppressed
                    </span>
                  </div>
                  
                  <div className="divide-y divide-slate-100">
                  {(() => {
                    const suppressedArticles = filteredArticles.filter(article => {
                      const activePO = article.suppression.activePO || db.purchaseOrders.find(po => po.article_number === article.article_number && (po.status === 'Approved' || po.status === 'Raised' || po.status === 'Submitted' || po.status === 'Pending'));
                      return article.statusLabel === 'Suppressed' || (activePO !== undefined && article.currentStock <= article.reorder_level);
                    });

                    if (suppressedArticles.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-400">
                          <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm">No matching alerts currently suppressed.</p>
                          <p className="text-xs text-slate-400 mt-1">Items below reorder limit do not have active purchase orders pending.</p>
                        </div>
                      );
                    }

                    return suppressedArticles.map((article, index) => {
                      const activePO = article.suppression.activePO || db.purchaseOrders.find(po => po.article_number === article.article_number && (po.status === 'Approved' || po.status === 'Raised' || po.status === 'Submitted' || po.status === 'Pending'));
                      if (!activePO) return null;
                      const approvedPO = activePO;

                      const deliveryDateStr = approvedPO.expected_delivery_date || approvedPO.order_date || simulatedDate;
                      const deliveryDate = new Date(deliveryDateStr.includes('T') ? deliveryDateStr : deliveryDateStr + 'T00:00:00');
                      const today = new Date(simulatedDate.includes('T') ? simulatedDate : simulatedDate + 'T00:00:00');
                      const validDeliveryTime = isNaN(deliveryDate.getTime()) ? today.getTime() : deliveryDate.getTime();
                      const validTodayTime = isNaN(today.getTime()) ? Date.now() : today.getTime();
                      const diffTime = validDeliveryTime - validTodayTime;
                      const rawDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const diffDays = isNaN(rawDiffDays) ? 0 : rawDiffDays;

                      let cardBg = "bg-white hover:bg-slate-50";
                      let badgeStyle = "bg-slate-100 text-slate-700 border border-slate-200";
                      let badgeText = `🚚 Delivery expected in ${diffDays} days`;
                      let textMain = "text-slate-800";
                      let textMuted = "text-slate-500 font-mono";
                      let formulaBg = "bg-slate-50 border border-slate-100";
                      let linkBadge = "bg-amber-100 text-amber-800 hover:bg-amber-200";
                      let textSub = "text-slate-700";
                      let labelColor = "text-slate-400";
                      let isOverdue = false;

                      if (diffDays >= 1 && diffDays <= 3) {
                        cardBg = "bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-500";
                        badgeStyle = "bg-amber-100 text-amber-950 font-bold border border-amber-200";
                        badgeText = "🟨 Warning: Delivery Due Within 3 Days";
                        textMain = "text-amber-950";
                        textMuted = "text-amber-800/80 font-mono";
                        formulaBg = "bg-white/75 border border-amber-200";
                        linkBadge = "bg-amber-200 text-amber-950 hover:bg-amber-300";
                        textSub = "text-amber-900";
                        labelColor = "text-amber-700/70";
                      } else if (diffDays <= 0) {
                        cardBg = "bg-red-500 text-white border-4 border-red-600 animate-[pulse_1.5s_infinite]";
                        badgeStyle = "bg-white text-red-700 font-bold border border-red-200 animate-[bounce_1s_infinite]";
                        badgeText = "🚨 OVERDUE DELIVERY - Immediate Action Required";
                        textMain = "text-white";
                        textMuted = "text-red-100 font-mono";
                        formulaBg = "bg-red-600/50 border border-red-400/30";
                        linkBadge = "bg-red-600 text-white border border-red-400 hover:bg-red-700";
                        textSub = "text-red-50";
                        labelColor = "text-red-200";
                        isOverdue = true;
                      }

                      const safeCurrentStock = isNaN(article.currentStock) ? 0 : article.currentStock;
                      const safeDailyBurn = isNaN(article.dailyBurn) ? 0 : article.dailyBurn;
                      const daysUntilDel = Math.max(0, diffDays);
                      const calcProjected = Math.round(safeCurrentStock - (daysUntilDel * safeDailyBurn));
                      const finalProjected = (article.suppression.projectedStockOnArrival !== null && !isNaN(article.suppression.projectedStockOnArrival))
                        ? article.suppression.projectedStockOnArrival
                        : calcProjected;
                      const safeProjected = isNaN(finalProjected) ? 0 : finalProjected;

                      return (
                        <div key={`${article.article_number}-${index}`} className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition ${cardBg}`}>
                          <div className="space-y-2 max-w-xl">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${linkBadge}`}>
                                {article.article_number}
                              </span>
                              <span className={`font-bold ${isOverdue ? 'text-white' : 'text-slate-800'}`}>
                                {article.description}
                              </span>
                            </div>

                            {/* Smart PO Info Badge */}
                            <div className={`p-3 rounded-xl space-y-1.5 ${formulaBg}`}>
                              <div className="text-xs flex items-center gap-1.5 font-semibold">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeStyle}`}>
                                  {badgeText}
                                </span>
                                <span className="opacity-85 text-[11px]">
                                  Order Placed (<strong className="font-mono">{approvedPO.po_number}</strong>).
                                  Delivery Channel: <strong className="font-sans">{article.ordering_channel}</strong>.
                                </span>
                              </div>
                              {/* Projected stock calculation formula disclosure */}
                              <div className={`text-[10.5px] font-mono pl-5 leading-relaxed p-1.5 rounded bg-black/5`}>
                                <div>Formula: Projected Stock = Current - (Days until Delivery × Burn Rate)</div>
                                <div className="mt-0.5">
                                  Calculation: {safeCurrentStock} - ({daysUntilDel} days × {safeDailyBurn.toFixed(1)}/d) ={' '}
                                  <span className={`font-bold ${isOverdue ? 'text-white underline' : 'text-amber-700'}`}>
                                    {String(safeProjected)} {article.smallest_unit_name || 'unit'}s
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-1 text-xs">
                              <div>
                                <div className={`${labelColor}`}>Current Stock</div>
                                <div className={`font-bold font-mono ${isOverdue ? 'text-white' : 'text-amber-600'}`}>
                                  {safeCurrentStock.toLocaleString()} {article.smallest_unit_name}s
                                </div>
                              </div>
                              <div>
                                <div className={`${labelColor}`}>Reorder Level</div>
                                <div className={`font-bold font-mono ${isOverdue ? 'text-white' : 'text-slate-700'}`}>
                                  {(article.reorder_level ?? 0).toLocaleString()} {article.smallest_unit_name}s
                                </div>
                              </div>
                              <div>
                                <div className={`${labelColor}`}>Daily Burn Rate</div>
                                <div className={`font-bold font-mono ${isOverdue ? 'text-white' : 'text-slate-700'}`}>
                                  {safeDailyBurn.toFixed(1)} / day
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Explicit Accept / Reject Buttons */}
                          <div className={`p-4 rounded-xl flex flex-col justify-center gap-2.5 w-full lg:w-48 ${isOverdue ? 'bg-red-600/40 border border-red-400/30' : 'bg-slate-50 border border-slate-100'}`}>
                            <button
                              onClick={() => handleOpenReceivePrompt(approvedPO)}
                              className={`w-full font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                                isOverdue 
                                  ? 'bg-white text-red-700 hover:bg-slate-100' 
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Accept Delivery
                            </button>
                            <button
                              onClick={() => handleRejectDelivery(approvedPO)}
                              className={`w-full font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                                isOverdue 
                                  ? 'bg-red-800 text-white hover:bg-red-900 border border-red-700' 
                                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Reject Delivery
                            </button>
                            <span className={`text-[9px] text-center max-w-[170px] mx-auto opacity-75 ${isOverdue ? 'text-red-100' : 'text-slate-500'}`}>
                              Verifies packaging storage & instantly updates shelf count.
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

              {/* 3. HEALTHY STOCK PANEL */}
              {(stockFilter === 'All' || stockFilter === 'Healthy') && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-bold text-sm uppercase tracking-wider">🟢 Healthy Stock Ranges</h3>
                    </div>
                  </div>
                  
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      const healthyArticles = filteredArticles.filter(article => {
                        return article.statusLabel === 'Healthy' || article.total_stock_quantity > article.reorder_level;
                      });

                      if (healthyArticles.length === 0) {
                        return (
                          <div className="col-span-full py-6 text-center text-slate-400 text-sm">
                            No matching healthy items.
                          </div>
                        );
                      }

                      return healthyArticles.map((article, index) => (
                        <div key={`${article.article_number}-${index}`} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white hover:border-slate-300 transition shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              {article.article_number}
                            </span>
                            <span className="font-bold text-sm text-slate-800 mt-1 block truncate w-full">
                              {article.description}
                            </span>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Stable
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg text-xs grid grid-cols-2 gap-2 font-mono">
                          <div>
                            <span className="text-slate-400">Stock:</span>{' '}
                            <strong className="text-slate-700">{(article.currentStock ?? 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Limit:</span>{' '}
                            <strong className="text-slate-700">{(article.reorder_level ?? 0).toLocaleString()}</strong>
                          </div>
                          <div className="col-span-2 text-[11px]">
                            <span className="text-slate-400">Est. Usage:</span>{' '}
                            <strong className="text-slate-700">{(article.estimated_monthly_usage ?? 0).toLocaleString()} /mo</strong>
                          </div>
                        </div>

                        {/* Dynamic expected stock tooltip indicator */}
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            Expected stock tomorrow: <strong>{Math.max(0, Math.round((isNaN(article.currentStock) ? 0 : article.currentStock) - (isNaN(article.dailyBurn) ? 0 : article.dailyBurn)))}</strong> units.
                          </span>
                        </div>
                      </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* 4. AUTOMATED SUGGESTED ORDER GENERATOR ENGINE PANEL */}
              <div className="bg-white border border-indigo-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-white">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400">⚡ Delhi Station Automated Next Order Generator</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Evaluates current stock levels against daily burn rates, lead times, and order frequencies to auto-generate Buy Orders / Quotes.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-indigo-600 text-white text-[10px] font-bold font-mono px-2.5 py-1 rounded-full uppercase">
                      Suggested POs: {suggestedOrders.length}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-6">
                  {suggestedOrders.length === 0 ? (
                    <div className="py-10 text-center text-slate-400">
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                      <h4 className="font-bold text-slate-700 text-sm">All Inventory Lines Optimal</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        No articles meet Delhi Station&apos;s reorder triggers today. Depleted items are already suppressed by active purchase orders in transit.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Bulk Controls Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              checked={suggestedOrders.length > 0 && selectedReorders.length === suggestedOrders.length}
                              onChange={() => {
                                if (selectedReorders.length === suggestedOrders.length) {
                                  setSelectedReorders([]);
                                } else {
                                  setSelectedReorders(suggestedOrders.map(o => o.article_number));
                                }
                              }}
                            />
                            <span>Select All ({suggestedOrders.length} Items Recommended)</span>
                          </label>
                          <span className="text-xs text-slate-400 font-mono">
                            | {selectedReorders.length} Selected
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handleExportSelectedReorders}
                            disabled={selectedReorders.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                            title="Export selected reorder queue spreadsheet before placing orders"
                          >
                            <FileSpreadsheet className="w-4 h-4" /> Export Selected to Excel
                          </button>
                          <button
                            onClick={handleGenerateBulkPOs}
                            disabled={selectedReorders.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Generate Bulk POs for Selected ({selectedReorders.length} Items)</span>
                          </button>
                        </div>
                      </div>

                      {/* Unified Queue Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                                <th className="p-3 w-10 text-center">
                                  <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                    checked={suggestedOrders.length > 0 && selectedReorders.length === suggestedOrders.length}
                                    onChange={() => {
                                      if (selectedReorders.length === suggestedOrders.length) {
                                        setSelectedReorders([]);
                                      } else {
                                        setSelectedReorders(suggestedOrders.map(o => o.article_number));
                                      }
                                    }}
                                  />
                                </th>
                                <th className="p-3">Article Details</th>
                                <th className="p-3">Metrics (Stock / Reorder)</th>
                                <th className="p-3">Trigger Reasons</th>
                                <th className="p-3 w-48">Suggested & Override Qty</th>
                                <th className="p-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {suggestedOrders.map((article, index) => {
                                const isChecked = selectedReorders.includes(article.article_number);
                                const suggestedQty = Math.max(article.order_volume, article.max_quantity - article.currentStock);
                                const currentVal = overrideReorderQtys[article.article_number] ?? suggestedQty;

                                const dailyBurn = isNaN(article.dailyBurn) ? 0 : article.dailyBurn;
                                const safeStock = isNaN(article.currentStock) ? 0 : article.currentStock;
                                const daysUntilZero = dailyBurn > 0 ? (safeStock / dailyBurn) : 9999;
                                const safeDaysUntilZero = isNaN(daysUntilZero) ? 9999 : daysUntilZero;
                                
                                // Calculate days since last PO
                                const itemPOs = db.purchaseOrders
                                  .filter(po => po.article_number === article.article_number)
                                  .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
                                let daysSinceLastPO = 9999;
                                if (itemPOs.length > 0) {
                                  const lastPO = itemPOs[0];
                                  const msDiff = new Date(simulatedDate).getTime() - new Date(lastPO.order_date).getTime();
                                  daysSinceLastPO = isNaN(msDiff) ? 9999 : Math.max(0, msDiff / (1000 * 60 * 60 * 24));
                                }

                                const condition1 = safeStock <= (article.reorder_level ?? 0);
                                const condition2 = safeDaysUntilZero <= (article.lead_time_days ?? 0);
                                const condition3 = daysSinceLastPO >= (article.order_frequency_days ?? 0) && safeStock <= ((article.reorder_level ?? 0) * 1.1);

                                // Packaging breakdown for live override conversion
                                const { packs, boxes, pieces } = getPackagingBreakdown(
                                  currentVal,
                                  article.units_per_box,
                                  article.boxes_per_pack,
                                  article.smallest_unit_name
                                );

                                return (
                                  <tr key={`${article.article_number}-${index}`} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-indigo-50/20' : ''}`}>
                                    {/* Checkbox Column */}
                                    <td className="p-3 text-center align-middle">
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setSelectedReorders(selectedReorders.filter(id => id !== article.article_number));
                                          } else {
                                            setSelectedReorders([...selectedReorders, article.article_number]);
                                          }
                                        }}
                                      />
                                    </td>

                                    {/* Article Details Column */}
                                    <td className="p-3 min-w-[200px]">
                                      <div className="flex items-center gap-2.5">
                                        {article.image_url ? (
                                          <img src={article.image_url} alt={article.description} className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                                            <Package className="w-5 h-5 text-slate-400" />
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1 rounded text-[10px]">
                                              {article.article_number}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                              article.ordering_channel === 'Central Ordering Team'
                                                ? 'text-amber-600 bg-amber-50 font-mono' 
                                                : 'text-emerald-600 bg-emerald-50'
                                            }`}>
                                              {article.ordering_channel} ({article.lead_time_days}d lead)
                                            </span>
                                          </div>
                                          <div className="font-bold text-slate-800 text-xs mt-1 truncate max-w-[240px]">
                                            {article.description}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Metrics Column */}
                                    <td className="p-3 font-mono text-[11px] text-slate-600 space-y-1">
                                      <div className="flex justify-between gap-4">
                                        <span>Stock:</span>
                                        <span className="font-bold text-slate-800">{(article.currentStock ?? 0).toLocaleString()} / {(article.reorder_level ?? 0).toLocaleString()} (Min)</span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span>Burn Rate:</span>
                                        <span>{dailyBurn.toFixed(1)}/day ({isFinite(safeDaysUntilZero) && !isNaN(safeDaysUntilZero) ? safeDaysUntilZero.toFixed(1) : '999+'}d left)</span>
                                      </div>
                                    </td>

                                    {/* Trigger Reasons Column */}
                                    <td className="p-3">
                                      <div className="flex flex-col gap-1">
                                        {condition1 && (
                                          <span className="inline-flex items-center justify-center bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] w-fit">
                                            ⚠️ Q &le; Reorder Level
                                          </span>
                                        )}
                                        {condition2 && (
                                          <span className="inline-flex items-center justify-center bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px] w-fit">
                                            ⏳ Depletion &le; Lead Time
                                          </span>
                                        )}
                                        {condition3 && (
                                          <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] w-fit">
                                            🔄 Cycle Exceeded
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Suggested & Override Qty Column */}
                                    <td className="p-3">
                                      <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="number"
                                            className="w-24 px-2 py-1 rounded border border-slate-300 font-mono text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            min={1}
                                            value={currentVal}
                                            onChange={(e) => {
                                              const val = Math.max(1, Number(e.target.value));
                                              setOverrideReorderQtys({
                                                ...overrideReorderQtys,
                                                [article.article_number]: val
                                              });
                                              // Auto select the row if user interacts with input
                                              if (!isChecked) {
                                                setSelectedReorders([...selectedReorders, article.article_number]);
                                              }
                                            }}
                                          />
                                          <span className="text-[10px] text-slate-400 font-medium">units</span>
                                        </div>
                                        <div className="text-[10px] text-indigo-600 font-semibold bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/30 w-fit">
                                          Equivalent to: {packs} Pack{packs !== 1 && 's'}, {boxes} Box{boxes !== 1 && 'es'}, {pieces} Piece{pieces !== 1 && 's'}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Action Column */}
                                    <td className="p-3 text-right align-middle">
                                      <button
                                        onClick={() => {
                                          // Generate a single PO for this item immediately
                                          const poNum = `PO-2026-${String(db.purchaseOrders.length + 1).padStart(3, '0')}`;
                                          const orderDate = simulatedDate;
                                          const expectedDel = new Date(orderDate);
                                          expectedDel.setDate(expectedDel.getDate() + article.lead_time_days);
                                          const expectedDelStr = expectedDel.toISOString().split('T')[0];

                                          const newPO: PurchaseOrder = {
                                            po_number: poNum,
                                            article_number: article.article_number,
                                            order_date: orderDate,
                                            expected_delivery_date: expectedDelStr,
                                            order_quantity_units: currentVal,
                                            status: 'Raised'
                                          };

                                          updateDb({
                                            ...db,
                                            purchaseOrders: [...db.purchaseOrders, newPO]
                                          });

                                          playBeep();
                                          setSelectedPOWorkflow(newPO);
                                          alert(`Purchase Order ${poNum} successfully generated in 'Raised' status!`);
                                        }}
                                        className="bg-slate-900 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                      >
                                        Place PO
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </div>

            </div>
        )}

  </>
  );
}
