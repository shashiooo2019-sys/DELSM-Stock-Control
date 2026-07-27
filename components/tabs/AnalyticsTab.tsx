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

export default function AnalyticsTab({ store }: { store: InventoryStore }) {
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
    <>
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Header section with instructions */}
            <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border-4 border-slate-900 shrink-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />
              <div className="space-y-2 relative z-10 max-w-2xl">
                <span className="bg-amber-400 text-slate-950 font-mono font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">
                  Fulfillment Intel
                </span>
                <h2 className="text-2xl font-black tracking-tight font-display text-white">
                  Monthly Consumption Analytics
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  This panel computes dynamic actual monthly consumption by adjusting baseline monthly estimates with the physical count discrepancies from stock taking audits.
                </p>
              </div>
              <div className="flex gap-2 relative z-10">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                  <Database className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Source Database</span>
                    <strong className="text-xs font-mono text-slate-200">Local & Logs Engine</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Total Stock Audit Logs */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Stock Audits Count</span>
                  <History className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <strong className="text-2xl font-black font-mono text-slate-900">{analyticsKPIs.totalLogs}</strong>
                  <span className="text-xs text-slate-500">logged counts</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Total physical audit records submitted via the barcode stocktaking tab.
                </p>
              </div>

              {/* Card 2: Cumulative Discrepancy */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Cumulative Discrepancy</span>
                  {analyticsKPIs.cumulativeVariance < 0 ? (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <strong className={`text-2xl font-black font-mono ${
                    analyticsKPIs.cumulativeVariance < 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    {analyticsKPIs.cumulativeVariance > 0 ? '+' : ''}
                    {(analyticsKPIs.cumulativeVariance ?? 0).toLocaleString()}
                  </strong>
                  <span className="text-xs text-slate-500">units</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  {analyticsKPIs.cumulativeVariance < 0 
                    ? "YTD Net Deficit: Stock levels are burning faster than baseline monthly estimates."
                    : analyticsKPIs.cumulativeVariance > 0
                      ? "YTD Net Surplus: Stock levels are burning slower than baseline monthly estimates."
                      : "YTD Matched: Stock counts perfectly align with model burn rate predictions."}
                </p>
              </div>

              {/* Card 3: Top Consumed Item (Current Month) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Highest Demand Article</span>
                  <Package className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <strong className="text-slate-900 font-bold block truncate text-sm" title={analyticsKPIs.topArticleName}>
                    {analyticsKPIs.topArticleName}
                  </strong>
                  <span className="text-xs text-slate-500 font-mono">
                    {(analyticsKPIs.maxConsumption ?? 0).toLocaleString()} units consumed
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Identified as the highest-volume consumption article in the current month.
                </p>
              </div>

              {/* Card 4: Baseline Monthly Flow */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Standard Monthly Flow</span>
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <strong className="text-2xl font-black font-mono text-slate-900">
                    {db.stockMaster.reduce((sum, art) => sum + (art.estimated_monthly_usage ?? 0), 0).toLocaleString()}
                  </strong>
                  <span className="text-xs text-slate-500">units/mo</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Total baseline monthly burn-rate standard estimated for all stocked articles combined.
                </p>
              </div>

            </div>

            {/* Main Interactive Controls & Chart Container */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              
              {/* Filters Panel */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-900">Consumption Trend Visualizer</h3>
                  <p className="text-xs text-slate-500">Select an article or look at aggregate station usage trends.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Article Select Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold uppercase font-mono">Analyze:</span>
                    <select
                      value={selectedArticleFilter}
                      onChange={(e) => setSelectedArticleFilter(e.target.value)}
                      className="border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 font-sans font-semibold rounded-xl text-xs px-3.5 py-2 transition outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="all">📊 All Articles (Aggregate)</option>
                      {db.stockMaster.map(art => (
                        <option key={art.article_number} value={art.article_number}>
                          📦 {art.article_number} - {art.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chart Style Toggles */}
                  <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      onClick={() => setAnalyticsChartType('line')}
                      className={`px-3 py-2 text-xs font-bold font-sans transition cursor-pointer focus:outline-none ${
                        analyticsChartType === 'line'
                          ? 'bg-white shadow-sm text-indigo-600 font-black border-r border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Line Trend
                    </button>
                    <button
                      onClick={() => setAnalyticsChartType('bar')}
                      className={`px-3 py-2 text-xs font-bold font-sans transition cursor-pointer focus:outline-none ${
                        analyticsChartType === 'bar'
                          ? 'bg-white shadow-sm text-indigo-600 font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Bar Columns
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Render Area */}
              <div className="min-h-[350px] relative">
                {!analyticsMounted ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl gap-3">
                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                    <span className="text-xs text-slate-400 font-mono">Initializing chart engine...</span>
                  </div>
                ) : (
                  <div className="w-full h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {analyticsChartType === 'line' ? (
                        <LineChart
                          data={monthlyData}
                          margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                          <XAxis 
                            dataKey="month" 
                            stroke="#94A3B8" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#94A3B8" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(v) => v.toLocaleString()}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              borderRadius: '12px',
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                              fontFamily: 'sans-serif',
                              fontSize: '11px'
                            }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                          
                          {selectedArticleFilter === 'all' ? (
                            <>
                              <Line 
                                name="Actual Aggregated Consumption" 
                                type="monotone" 
                                dataKey="Total" 
                                stroke="#6366F1" 
                                strokeWidth={3} 
                                dot={{ r: 4, strokeWidth: 0, fill: '#6366F1' }}
                                activeDot={{ r: 6 }} 
                              />
                              <Line 
                                name="Estimated Consumption Baseline" 
                                type="monotone" 
                                dataKey="TotalEstimated" 
                                stroke="#94A3B8" 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                                dot={false} 
                              />
                            </>
                          ) : (
                            <>
                              <Line 
                                name={`Actual Consumption (${selectedArticleFilter})`} 
                                type="monotone" 
                                dataKey={selectedArticleFilter} 
                                stroke="#F59E0B" 
                                strokeWidth={3} 
                                dot={{ r: 4, strokeWidth: 0, fill: '#F59E0B' }}
                                activeDot={{ r: 6 }} 
                              />
                              <Line 
                                name="Standard Baseline Estimate" 
                                type="monotone" 
                                dataKey={() => {
                                  const item = db.stockMaster.find(art => art.article_number === selectedArticleFilter);
                                  return item ? item.estimated_monthly_usage : 0;
                                }} 
                                stroke="#94A3B8" 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                                dot={false} 
                              />
                            </>
                          )}
                        </LineChart>
                      ) : (
                        <BarChart
                          data={monthlyData}
                          margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                          <XAxis 
                            dataKey="month" 
                            stroke="#94A3B8" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#94A3B8" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(v) => v.toLocaleString()}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              borderRadius: '12px',
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                              fontFamily: 'sans-serif',
                              fontSize: '11px'
                            }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                          
                          {selectedArticleFilter === 'all' ? (
                            <>
                              <Bar 
                                name="Actual Aggregated Consumption" 
                                dataKey="Total" 
                                fill="#6366F1" 
                                radius={[4, 4, 0, 0]} 
                              />
                              <Bar 
                                name="Estimated Consumption Baseline" 
                                dataKey="TotalEstimated" 
                                fill="#CBD5E1" 
                                radius={[4, 4, 0, 0]} 
                              />
                            </>
                          ) : (
                            <>
                              <Bar 
                                name={`Actual Consumption (${selectedArticleFilter})`} 
                                dataKey={selectedArticleFilter} 
                                fill="#F59E0B" 
                                radius={[4, 4, 0, 0]} 
                              />
                              <Bar 
                                name="Standard Baseline Estimate" 
                                dataKey={() => {
                                  const item = db.stockMaster.find(art => art.article_number === selectedArticleFilter);
                                  return item ? item.estimated_monthly_usage : 0;
                                }} 
                                fill="#CBD5E1" 
                                radius={[4, 4, 0, 0]} 
                              />
                            </>
                          )}
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Variance Chart Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900">Physical Count Discrepancy Auditing</h3>
                <p className="text-xs text-slate-500">
                  Deficit (- values) indicates usage was higher than model predictors, whereas Surplus (+ values) shows slower usage.
                </p>
              </div>

              <div className="h-[220px]">
                {!analyticsMounted ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-2xl">
                    <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        stroke="#94A3B8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#94A3B8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                          fontFamily: 'sans-serif',
                          fontSize: '11px'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                      
                      {selectedArticleFilter === 'all' ? (
                        <Bar 
                          name="Aggregate Discrepancy (Units)" 
                          dataKey="TotalDiscrepancy" 
                          fill="#818CF8" 
                          radius={[4, 4, 4, 4]} 
                        />
                      ) : (
                        <Bar 
                          name={`Discrepancy Units (${selectedArticleFilter})`} 
                          dataKey={`${selectedArticleFilter}_discrepancy`} 
                          fill="#F59E0B" 
                          radius={[4, 4, 4, 4]} 
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        )}

  </>
  );
}
