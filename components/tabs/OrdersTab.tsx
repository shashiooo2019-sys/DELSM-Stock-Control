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

export default function OrdersTab({ store }: { store: InventoryStore }) {
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
    <>        {/* TAB 5: PURCHASE ORDERS WORKFLOW */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Purchase Orders Workflow</h2>
                <p className="text-xs text-slate-500">Track current ordering pipelines, lead delivery status, and historical fulfillment.</p>
              </div>
              <button
                onClick={() => {
                  if (db.stockMaster.length > 0) {
                    setManualPOForm({
                      article_number: db.stockMaster[0].article_number,
                      order_quantity_units: db.stockMaster[0].order_volume,
                      lead_time_days: db.stockMaster[0].lead_time_days
                    });
                    setQuantityError('');
                    setIsManualPOModalOpen(true);
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create Manual PO</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                      <th className="p-4">PO Number</th>
                      <th className="p-4">Article</th>
                      <th className="p-4">Date Placed</th>
                      <th className="p-4">Expected Delivery</th>
                      <th className="p-4">Quantity Units</th>
                      <th className="p-4">Delivery Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono">
                    {db.purchaseOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          No purchase orders generated.
                        </td>
                      </tr>
                    ) : (
                      [...db.purchaseOrders]
                        .sort((a, b) => b.po_number.localeCompare(a.po_number))
                        .map(po => {
                          const article = db.stockMaster.find(m => m.article_number === po.article_number);
                          
                          // Determine if late or soon
                          const expectedTime = new Date(po.expected_delivery_date).getTime();
                          const simulatedTime = new Date(simulatedDate).getTime();
                          const daysUntil = Math.ceil((expectedTime - simulatedTime) / (1000 * 60 * 60 * 24));

                          return (
                            <tr key={po.po_number} className="hover:bg-slate-50/80 transition text-slate-700">
                              <td className="p-4 font-bold text-slate-900">
                                <button
                                  onClick={() => setSelectedPOWorkflow(po)}
                                  className="font-bold text-indigo-600 hover:underline hover:text-indigo-800 transition cursor-pointer focus:outline-none"
                                  title="Open interactive Purchase Order workflow wizard"
                                >
                                  {po.po_number}
                                </button>
                              </td>
                              <td className="p-4 font-sans font-bold max-w-xs">
                                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                  {po.article_number}
                                </span>
                                <span className="text-xs text-slate-800 mt-0.5 text-left block">
                                  {article?.description || "Deleted Article"}
                                </span>
                              </td>
                              <td className="p-4">{po.order_date}</td>
                              <td className="p-4">
                                <div>{po.expected_delivery_date}</div>
                                {po.status !== 'Received' && po.status !== 'Rejected' && (
                                  <div className="text-[10px] text-amber-600 font-bold font-sans">
                                    {daysUntil > 0 ? `${daysUntil} days left` : "OVERDUE (Ready to accept)"}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 font-bold">{(po.order_quantity_units ?? 0).toLocaleString()}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                                  po.status === 'Received' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : po.status === 'Approved' 
                                      ? 'bg-blue-100 text-blue-800 animate-pulse' 
                                      : po.status === 'Raised' 
                                        ? 'bg-amber-100 text-amber-800' 
                                        : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {po.status}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {po.status === 'Raised' && (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => handlePOStateChange(po, 'Approved')}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-sans text-[10px] px-3 py-1.5 rounded transition shadow-sm cursor-pointer"
                                    >
                                      Approve PO
                                    </button>
                                    <button
                                      onClick={() => handlePOStateChange(po, 'Rejected')}
                                      className="bg-red-500 hover:bg-red-600 text-white font-bold font-sans text-[10px] px-3 py-1.5 rounded transition shadow-sm cursor-pointer"
                                    >
                                      Reject PO
                                    </button>
                                  </div>
                                )}
                                {po.status === 'Approved' && (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => handleReceivePO(po)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-sans text-[10px] px-3 py-1.5 rounded transition shadow-sm cursor-pointer"
                                    >
                                      Accept Delivery
                                    </button>
                                    <button
                                      onClick={() => handleRejectDelivery(po)}
                                      className="bg-slate-500 hover:bg-slate-600 text-white font-bold font-sans text-[10px] px-3 py-1.5 rounded transition shadow-sm cursor-pointer"
                                    >
                                      Reject Delivery
                                    </button>
                                  </div>
                                )}
                                {po.status !== 'Raised' && po.status !== 'Approved' && (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => setSelectedPOWorkflow(po)}
                                      className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold font-sans text-[10px] px-2.5 py-1.5 rounded transition shadow-xs cursor-pointer"
                                    >
                                      View Workflow
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

  </>
  );
}
