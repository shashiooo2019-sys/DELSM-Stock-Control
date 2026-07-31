'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react'; /* TEST */
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import PublicSearch from '@/components/PublicSearch';
import GoogleWorkspaceModal from '@/components/GoogleWorkspaceModal';
import EditArticleModal from '@/components/EditArticleModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import ManualPOModal from '@/components/ManualPOModal';
import { ExcelStockGrid } from '@/components/ExcelStockGrid';
import AnalyticsTab from '@/components/AnalyticsTab';
import {
  Package,
  Barcode,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Calendar,
  ArrowRight,
  Search,
  Plus,
  Edit2,
  Trash2,
  History,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  List,
  Sparkles,
  Clock,
  Settings,
  Volume2,
  VolumeX,
  Camera,
  Eye,
  Database,
  CornerDownRight,
  RefreshCw,
  TrendingDown,
  Inbox,
  LayoutGrid,
  Info,
  Layers,
  Archive,
  ArrowUpDown,
  FileSpreadsheet,
  User,
  Lock,
  Unlock,
  Shield,
  LogIn,
  LogOut,
  Menu,
  Upload,
  Maximize2,
  Save,
  FileText,
  CloudUpload,
  AlertCircle,
  RotateCcw,
  Check,
  TableProperties,
  Zap,
  Sliders
} from 'lucide-react';
import {
  StockMaster,
  StockTakingLog,
  PurchaseOrder,
  OrderingChannel,
  StockTakingInputType,
  DiscrepancyStatus,
  POStatus,
  loadDatabase,
  saveDatabase,
  subscribeToDatabase,
  saveStockMasterToFirestore,
  deleteStockMasterFromFirestore,
  saveStockLogToFirestore,
  deleteStockLogFromFirestore,
  savePurchaseOrderToFirestore,
  deletePurchaseOrderFromFirestore,
  calculateDailyBurnRate,
  convertToSmallestUnits,
  getExpectedStock,
  evaluateSuppression,
  getDetailedStockEstimation,
  DetailedStockEstimation
} from '@/lib/db';

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

import {
  createId,
  getPackagingBreakdown,
  fuzzySearch
} from '@/lib/helpers';

export default function DelhiStationInventoryApp() {
  // ----------------------------------------------------
  // SYSTEM STATE
  // ----------------------------------------------------
  const [db, setDb] = useState<{
    stockMaster: StockMaster[];
    stockTakingLog: StockTakingLog[];
    purchaseOrders: PurchaseOrder[];
  }>(loadDatabase());

  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'scanner' | 'orders' | 'analytics'>('dashboard');
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isStockHeaderExpanded, setIsStockHeaderExpanded] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  // Firebase Firestore Realtime Subscription
  useEffect(() => {
    const unsubscribe = subscribeToDatabase((updatedDb) => {
      setDb(updatedDb);
    });
    return () => unsubscribe();
  }, []);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<{ username: string; role: 'user' | 'admin' } | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isGoogleWorkspaceModalOpen, setIsGoogleWorkspaceModalOpen] = useState(false);

  // Handle loading user session on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('delhi_station_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const handle = requestAnimationFrame(() => {
            setCurrentUser(parsed);
          });
          return () => cancelAnimationFrame(handle);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const username = loginUsername.trim().toLowerCase();
    const password = loginPassword;

    if (username === 'lh' && password === 'welcome') {
      const user = { username: 'lh', role: 'user' as const };
      setCurrentUser(user);
      localStorage.setItem('delhi_station_user', JSON.stringify(user));
      setIsLoginModalOpen(false);
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
      playBeep();
    } else if (username === 'admin' && password === 'Admin220!') {
      const user = { username: 'admin', role: 'admin' as const };
      setCurrentUser(user);
      localStorage.setItem('delhi_station_user', JSON.stringify(user));
      setIsLoginModalOpen(false);
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
      playBeep();
    } else {
      setLoginError('Invalid username or password.');
      playErrorBeep();
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('delhi_station_user');
    playBeep();
  };

  // Simulation Date & Scenario Offset
  const [simulatedDate, setSimulatedDate] = useState<string>('2026-07-20');
  const [scenarioDaysOffset, setScenarioDaysOffset] = useState<number>(0);
  const [isProjDateModalOpen, setIsProjDateModalOpen] = useState(false);
  const [pendingProjDate, setPendingProjDate] = useState<string>('');
  
  // Search and view states
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerGridSearchQuery, setScannerGridSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'All' | 'Central' | 'Local'>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Healthy' | 'Low' | 'Action Needed' | 'Suppressed' | 'Below Lead Days'>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [stockViewMode, setStockViewMode] = useState<'table' | 'grouped' | 'gridEdit' | 'spreadsheetView'>('spreadsheetView');
  const [collapsedLocations, setCollapsedLocations] = useState<Record<string, boolean>>({});

  // Quick Excel Grid Editing States
  const [gridEdits, setGridEdits] = useState<Record<string, Partial<StockMaster>>>({});
  const [gridAutoSave, setGridAutoSave] = useState<boolean>(true);
  const [gridSavedToast, setGridSavedToast] = useState<string | null>(null);
  const [gridSaveError, setGridSaveError] = useState<string | null>(null);
  const [isBatchSavingGrid, setIsBatchSavingGrid] = useState<boolean>(false);
  const [batchLocationInput, setBatchLocationInput] = useState<string>('');

  // Scanner Simulator States
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scannerError, setScannerError] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [fuzzyQuery, setFuzzyQuery] = useState('');
  const [fuzzyDropdownOpen, setFuzzyDropdownOpen] = useState(false);

  // Scanner input count states
  const [scanPacks, setScanPacks] = useState<number>(0);
  const [scanBoxes, setScanBoxes] = useState<number>(0);
  const [scanUnits, setScanUnits] = useState<number>(0);
  const [scannedArticle, setScannedArticle] = useState<StockMaster | null>(null);
  const [isStocktakeLogExpanded, setIsStocktakeLogExpanded] = useState<boolean>(false);

  // Form states for creating/editing Article
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importedData, setImportedData] = useState<any[]>([]);
  const [selectedArticleNumbers, setSelectedArticleNumbers] = useState<string[]>([]);
  const [editingArticle, setEditingArticle] = useState<StockMaster | null>(null);
  const [articleForm, setArticleForm] = useState<Omit<StockMaster, 'total_units_per_pack'>>({
    article_number: '',
    description: '',
    barcode: '',
    smallest_unit_name: 'Piece',
    units_per_box: 10,
    boxes_per_pack: 5,
    estimated_monthly_usage: 1200,
    min_quantity: 200,
    reorder_level: 400,
    max_quantity: 2000,
    total_stock_quantity: 0,
    order_frequency_days: 30,
    order_volume: 1000,
    ordering_channel: 'Local',
    lead_time_days: 5,
    location: '',
    quantity_details: '',
    min_order_qty: '',
    add_info: ''
  });

  // Manual PO modal and Workflow state variables
  const [isManualPOModalOpen, setIsManualPOModalOpen] = useState(false);
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const [quickOrderArticle, setQuickOrderArticle] = useState<StockMaster | null>(null);
  const [quickOrderQty, setQuickOrderQty] = useState<number>(0);
  const [quantityError, setQuantityError] = useState('');
  const [manualPOForm, setManualPOForm] = useState({
    article_number: '',
    order_quantity_units: 1000,
    lead_time_days: 5
  });
  const [selectedPOWorkflow, setSelectedPOWorkflow] = useState<PurchaseOrder | null>(null);

  // Delivery Receive states
  const [isReceivePromptOpen, setIsReceivePromptOpen] = useState(false);
  const [poToReceive, setPoToReceive] = useState<PurchaseOrder | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [receiveCupboard, setReceiveCupboard] = useState('Cupboard A');
  const [receiveShelf, setReceiveShelf] = useState('Shelf 1');
  const [receiveQty, setReceiveQty] = useState<number>(0);

  // Automated Next Order Generator States
  const [selectedReorders, setSelectedReorders] = useState<string[]>([]);
  const [overrideReorderQtys, setOverrideReorderQtys] = useState<Record<string, number>>({});

  // Custom confirmation modal state for safe in-app deletions (replaces buggy window.confirm)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    type: 'article' | 'location' | 'cupboard' | 'shelf' | 'bulk-articles';
    id: string;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'article',
    id: '',
    title: '',
    description: ''
  });


  // Save to LocalStorage whenever DB changes
  const updateDb = (newDb: typeof db) => {
    setDb(newDb);
    saveDatabase(newDb);
  };

  // Beep Sound Maker using AudioContext (Anti-slop, realistic scanner beep)
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch scan beep
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 100);
    } catch (e) {
      console.warn('Audio Context failed to start', e);
    }
  };

  // Sound generator for error beep
  const playErrorBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 250);
    } catch (e) {
      console.warn('Audio Context failed to start', e);
    }
  };

  // ----------------------------------------------------
  // TIME SIMULATION CONTROL
  // ----------------------------------------------------
  const advanceTime = (days: number) => {
    const currentDate = new Date(simulatedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDateStr = currentDate.toISOString().split('T')[0];
    setSimulatedDate(newDateStr);
  };

  // Reset simulated date to today
  const resetToToday = () => {
    setSimulatedDate('2026-07-20');
  };

  const handleConfirmProjectedDate = async () => {
    setIsProjDateModalOpen(false);
    if (!pendingProjDate) return;

    // 1. Calculate diff in days
    const baseDate = new Date(simulatedDate);
    const targetDate = new Date(pendingProjDate);
    const diffTime = targetDate.getTime() - baseDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 2. Set scenarioDaysOffset
    setScenarioDaysOffset(Math.max(0, diffDays));

    // 3. Clear fields: Quantity details (quantity_details) and Current Stock (total_stock_quantity) for all articles
    const updatedMaster = db.stockMaster.map(article => ({
      ...article,
      quantity_details: '',
      total_stock_quantity: 0
    }));

    // 4. Delete all stock log records in Firestore
    const logsToDelete = [...db.stockTakingLog];
    logsToDelete.forEach(log => {
      deleteStockLogFromFirestore(log.log_id).catch(err => {
        console.error(`Failed to delete stock log ${log.log_id} from Firestore:`, err);
      });
    });

    // 5. Update local database state
    updateDb({
      ...db,
      stockMaster: updatedMaster,
      stockTakingLog: []
    });

    // 6. Update all articles in Firestore
    try {
      await Promise.all(updatedMaster.map(item => saveStockMasterToFirestore(item)));
    } catch (err) {
      console.error("Failed to batch update stockMaster in Firestore:", err);
    }
  };

  // ----------------------------------------------------
  // CAMERA SCANNING CONTROL (HTML5 Webcam Simulator)
  // ----------------------------------------------------
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    if (useCamera) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.error("Camera access denied or unavailable", err);
          setUseCamera(false);
          setScannerError("Camera permission denied or camera not found. Using scanner simulation panel.");
        });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [useCamera]);

  // Trigger Simulated Scan
  const handleSimulateScan = (scannedValue: string) => {
    setScannerStatus('scanning');
    setScannedBarcode(scannedValue);
    setScannerError('');

    setTimeout(() => {
      let match;
      try {
        const parsed = JSON.parse(scannedValue);
        match = db.stockMaster.find(item => item.article_number === parsed.article_number);
      } catch (e) {
        match = db.stockMaster.find(item => item.barcode === scannedValue);
      }
      
      if (match) {
        setScannerStatus('success');
        setScannedArticle(match);
        playBeep();
        
        // Load existing counts
        setScanPacks(0);
        setScanBoxes(0);
        setScanUnits(0);
      } else {
        setScannerStatus('error');
        setScannerError(`Value ${scannedValue} not found in Delhi Station Master Stock.`);
        playErrorBeep();
      }
    }, 600);
  };

  // Manual Barcode Submit
  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;
    handleSimulateScan(scannedBarcode.trim());
  };

  // Save Physical Stock Count from Stocktaking Module
  const handleSavePhysicalCount = async () => {
    if (!scannedArticle) return;

    const totalCalculatedUnits = convertToSmallestUnits(
      scanPacks,
      scanBoxes,
      scanUnits,
      scannedArticle.units_per_box,
      scannedArticle.boxes_per_pack
    );

    // Compute dynamic expected stock
    const dailyBurn = calculateDailyBurnRate(scannedArticle.estimated_monthly_usage);
    const expected = getExpectedStock(
      scannedArticle.article_number,
      simulatedDate,
      db.stockTakingLog,
      db.stockMaster,
      dailyBurn
    );

    const discrepancy = totalCalculatedUnits - expected;
    let status: DiscrepancyStatus = 'Matched';
    if (discrepancy > 0) status = 'Surplus';
    if (discrepancy < 0) status = 'Deficit';

    // Insert Log Entry
    const newLog: StockTakingLog = {
      log_id: createId('LOG'),
      article_number: scannedArticle.article_number,
      timestamp: new Date(simulatedDate + 'T12:00:00Z').toISOString(),
      input_type: scanPacks > 0 ? 'Pack' : scanBoxes > 0 ? 'Box' : 'Smallest Unit',
      input_count: scanPacks > 0 ? scanPacks : scanBoxes > 0 ? scanBoxes : scanUnits,
      actual_quantity_units: totalCalculatedUnits,
      expected_quantity_units: expected,
      discrepancy_units: discrepancy,
      discrepancy_status: status
    };

    // Update the total stock quantity and free text quantity_details in stockMaster
    let updatedArticle: StockMaster | undefined;
    const updatedMaster = db.stockMaster.map(item => {
      if (item.article_number === scannedArticle.article_number) {
        updatedArticle = { 
          ...item, 
          total_stock_quantity: totalCalculatedUnits,
          quantity_details: scannedArticle.quantity_details || ''
        };
        return updatedArticle;
      }
      return item;
    });

    try {
      if (updatedArticle) {
        // Priority updated to Firebase database
        await saveStockMasterToFirestore(updatedArticle);
      }
      await saveStockLogToFirestore(newLog);

      // Local state is updated only after Firestore success
      updateDb({
        ...db,
        stockMaster: updatedMaster,
        stockTakingLog: [newLog, ...db.stockTakingLog]
      });

      // Reset Scanner success screen
      setScannerStatus('idle');
      setScannedBarcode('');
      setScannedArticle(null);
      alert(`Successfully registered stock count of ${totalCalculatedUnits.toLocaleString()} ${scannedArticle.smallest_unit_name}(s) for ${scannedArticle.description}. Stock master and Firebase updated!`);
    } catch (err: any) {
      console.error("Firestore save error on physical count:", err);
      alert(`Error saving stock count to Firebase: ${err.message || err}. Please check database connection.`);
    }
  };

  // ----------------------------------------------------
  // ARTICLE CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenAddModal = () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setLoginError('Administrator privileges are required to create new Master items. Please login as admin.');
      setIsLoginModalOpen(true);
      return;
    }
    setEditingArticle(null);
    setArticleForm({
      article_number: `DS-${1001 + db.stockMaster.length}`,
      description: '',
      barcode: Math.floor(1000000000000 + Math.random() * 900000000000).toString(),
      smallest_unit_name: 'Piece',
      units_per_box: 10,
      boxes_per_pack: 5,
      estimated_monthly_usage: 1500,
      min_quantity: 200,
      reorder_level: 400,
      max_quantity: 2000,
      total_stock_quantity: 0,
      order_frequency_days: 30,
      order_volume: 1000,
      ordering_channel: 'Local',
      lead_time_days: 5,
      location: ''
    });
    setIsArticleModalOpen(true);
  };

  // Excel Quick Grid Edit Handlers
  const handleGridCellChange = (
    articleNumber: string,
    field: keyof StockMaster,
    rawValue: any,
    autoSaveImmediate = false
  ) => {
    const article = db.stockMaster.find(a => a.article_number === articleNumber);
    if (!article) return;

    let value: any = rawValue;
    if ([
      'units_per_box',
      'boxes_per_pack',
      'estimated_monthly_usage',
      'min_quantity',
      'reorder_level',
      'max_quantity',
      'lead_time_days',
      'currentStock'
    ].includes(field as string)) {
      const parsed = parseFloat(rawValue);
      value = isNaN(parsed) ? 0 : parsed;
    }

    const updatedRowEdits = {
      ...(gridEdits[articleNumber] || {}),
      [field]: value
    };

    setGridEdits(prev => ({
      ...prev,
      [articleNumber]: updatedRowEdits
    }));

    if (autoSaveImmediate && article) {
      const merged = { ...article, ...updatedRowEdits };
      merged.total_units_per_pack = (merged.boxes_per_pack || 1) * (merged.units_per_box || 1);
      const estimatedUsage = merged.estimated_monthly_usage || 0;
      merged.dailyBurn = estimatedUsage / 30;

      let nextLogs = [...db.stockTakingLog];
      let logToSave: StockTakingLog | null = null;

      const newStockValue = Number(updatedRowEdits.currentStock);
      if (updatedRowEdits.currentStock !== undefined && !isNaN(newStockValue)) {
        const dailyBurn = calculateDailyBurnRate(merged.estimated_monthly_usage);
        const expected = getExpectedStock(
          article.article_number,
          simulatedDate,
          db.stockTakingLog,
          db.stockMaster,
          dailyBurn
        );
        const discrepancy = newStockValue - expected;
        const status = discrepancy === 0 ? 'Matched' : discrepancy > 0 ? 'Surplus' : 'Deficit';

        const newLog: StockTakingLog = {
          log_id: createId('LOG'),
          article_number: article.article_number,
          timestamp: new Date(simulatedDate + 'T12:00:00Z').toISOString(),
          input_type: 'Smallest Unit',
          input_count: newStockValue,
          actual_quantity_units: newStockValue,
          expected_quantity_units: expected,
          discrepancy_units: discrepancy,
          discrepancy_status: status
        };

        nextLogs = [newLog, ...nextLogs];
        logToSave = newLog;
        merged.total_stock_quantity = newStockValue;
      }

      const stock = merged.currentStock ?? 0;
      const reorder = merged.reorder_level ?? 0;
      const minQ = merged.min_quantity ?? 0;

      if (stock <= reorder) {
        merged.statusLabel = 'Action Needed';
      } else if (stock <= minQ * 1.2) {
        merged.statusLabel = 'Low';
      } else {
        merged.statusLabel = 'Healthy';
      }

      const nextMaster = db.stockMaster.map(item =>
        item.article_number === articleNumber ? merged : item
      );
      updateDb({ ...db, stockMaster: nextMaster, stockTakingLog: nextLogs });
      
      saveStockMasterToFirestore(merged).catch(err => {
        console.error("Firestore grid auto-save error:", err);
      });

      if (logToSave) {
        saveStockLogToFirestore(logToSave).catch(err => {
          console.error("Firestore log auto-save error:", err);
        });
      }
    }
  };

  const handleSaveGridRow = async (article: StockMaster) => {
    const rowEdit = gridEdits[article.article_number];
    if (!rowEdit || Object.keys(rowEdit).length === 0) return;

    const merged = { ...article, ...rowEdit };
    merged.total_units_per_pack = (merged.boxes_per_pack || 1) * (merged.units_per_box || 1);
    const estimatedUsage = merged.estimated_monthly_usage || 0;
    merged.dailyBurn = estimatedUsage / 30;

    let nextLogs = [...db.stockTakingLog];
    let logToSave: StockTakingLog | null = null;

    const newStockValue = Number(rowEdit.currentStock);
    if (rowEdit.currentStock !== undefined && !isNaN(newStockValue)) {
      const dailyBurn = calculateDailyBurnRate(merged.estimated_monthly_usage);
      const expected = getExpectedStock(
        article.article_number,
        simulatedDate,
        db.stockTakingLog,
        db.stockMaster,
        dailyBurn
      );
      const discrepancy = newStockValue - expected;
      const status = discrepancy === 0 ? 'Matched' : discrepancy > 0 ? 'Surplus' : 'Deficit';

      const newLog: StockTakingLog = {
        log_id: createId('LOG'),
        article_number: article.article_number,
        timestamp: new Date(simulatedDate + 'T12:00:00Z').toISOString(),
        input_type: 'Smallest Unit',
        input_count: newStockValue,
        actual_quantity_units: newStockValue,
        expected_quantity_units: expected,
        discrepancy_units: discrepancy,
        discrepancy_status: status
      };

      nextLogs = [newLog, ...nextLogs];
      logToSave = newLog;
      merged.total_stock_quantity = newStockValue;
    }

    const stock = merged.currentStock ?? 0;
    const reorder = merged.reorder_level ?? 0;
    const minQ = merged.min_quantity ?? 0;

    if (stock <= reorder) {
      merged.statusLabel = 'Action Needed';
    } else if (stock <= minQ * 1.2) {
      merged.statusLabel = 'Low';
    } else {
      merged.statusLabel = 'Healthy';
    }

    const nextMaster = db.stockMaster.map(item =>
      item.article_number === article.article_number ? merged : item
    );

    try {
      // Prioritize saving to Firestore first
      await saveStockMasterToFirestore(merged);
      if (logToSave) {
        await saveStockLogToFirestore(logToSave);
      }

      // Update local state only after successful Firestore save
      updateDb({ ...db, stockMaster: nextMaster, stockTakingLog: nextLogs });

      setGridEdits(prev => {
        const copy = { ...prev };
        delete copy[article.article_number];
        return copy;
      });
      setGridSavedToast(`Article ${article.article_number} updated and saved to Firestore!`);
      setTimeout(() => setGridSavedToast(null), 3000);
    } catch (err: any) {
      console.error("Firestore row save error:", err);
      setGridSaveError(`Error saving ${article.article_number}: ${err.message || err}`);
      setTimeout(() => setGridSaveError(null), 4000);
    }
  };

  const handleDiscardGridRow = (articleNumber: string) => {
    setGridEdits(prev => {
      const copy = { ...prev };
      delete copy[articleNumber];
      return copy;
    });
  };

  const handleSaveAllGridEdits = async () => {
    const modifiedArticles = Object.keys(gridEdits);
    if (modifiedArticles.length === 0) return;

    setIsBatchSavingGrid(true);
    setGridSaveError(null);

    try {
      let nextMaster = [...db.stockMaster];
      let nextLogs = [...db.stockTakingLog];
      const savedList: StockMaster[] = [];
      const logsToSave: StockTakingLog[] = [];

      for (const artNum of modifiedArticles) {
        const original = nextMaster.find(a => a.article_number === artNum);
        if (original) {
          const edits = gridEdits[artNum];
          const merged = { ...original, ...edits };
          merged.total_units_per_pack = (merged.boxes_per_pack || 1) * (merged.units_per_box || 1);
          const estimatedUsage = merged.estimated_monthly_usage || 0;
          merged.dailyBurn = estimatedUsage / 30;

          const newStockValue = Number(edits.currentStock);
          if (edits.currentStock !== undefined && !isNaN(newStockValue)) {
            const dailyBurn = calculateDailyBurnRate(merged.estimated_monthly_usage);
            const expected = getExpectedStock(
              original.article_number,
              simulatedDate,
              db.stockTakingLog,
              db.stockMaster,
              dailyBurn
            );
            const discrepancy = newStockValue - expected;
            const status = discrepancy === 0 ? 'Matched' : discrepancy > 0 ? 'Surplus' : 'Deficit';

            const newLog: StockTakingLog = {
              log_id: createId('LOG'),
              article_number: original.article_number,
              timestamp: new Date(simulatedDate + 'T12:00:00Z').toISOString(),
              input_type: 'Smallest Unit',
              input_count: newStockValue,
              actual_quantity_units: newStockValue,
              expected_quantity_units: expected,
              discrepancy_units: discrepancy,
              discrepancy_status: status
            };

            nextLogs = [newLog, ...nextLogs];
            logsToSave.push(newLog);
            merged.total_stock_quantity = newStockValue;
          }

          const stock = merged.currentStock ?? 0;
          const reorder = merged.reorder_level ?? 0;
          const minQ = merged.min_quantity ?? 0;

          if (stock <= reorder) {
            merged.statusLabel = 'Action Needed';
          } else if (stock <= minQ * 1.2) {
            merged.statusLabel = 'Low';
          } else {
            merged.statusLabel = 'Healthy';
          }

          nextMaster = nextMaster.map(a => a.article_number === artNum ? merged : a);
          savedList.push(merged);
        }
      }

      // Prioritize saving to Firestore first
      await Promise.all([
        ...savedList.map(item => saveStockMasterToFirestore(item)),
        ...logsToSave.map(log => saveStockLogToFirestore(log))
      ]);

      // Update local state only after successful Firestore save
      updateDb({ ...db, stockMaster: nextMaster, stockTakingLog: nextLogs });

      setGridEdits({});
      playBeep();
      setGridSavedToast(`Successfully updated and synced ${savedList.length} articles to Firebase Firestore!`);
      setTimeout(() => setGridSavedToast(null), 4000);
    } catch (err: any) {
      console.error("Batch grid save error:", err);
      setGridSaveError(`Error saving changes: ${err.message || err}`);
    } finally {
      setIsBatchSavingGrid(false);
    }
  };

  const handleDiscardAllGridEdits = () => {
    setGridEdits({});
  };

  const handleBulkApplyLocation = (newLoc: string) => {
    if (!newLoc.trim()) return;
    const targetNums = selectedArticleNumbers.length > 0
      ? selectedArticleNumbers
      : filteredArticles.map(a => a.article_number);

    const updatedEdits = { ...gridEdits };
    targetNums.forEach(num => {
      updatedEdits[num] = {
        ...(updatedEdits[num] || {}),
        location: newLoc.trim().toUpperCase()
      };
    });
    setGridEdits(updatedEdits);
    setBatchLocationInput('');
    setGridSavedToast(`Updated location to "${newLoc.trim().toUpperCase()}" for ${targetNums.length} items. Click "Save All" or leave auto-save enabled.`);
    setTimeout(() => setGridSavedToast(null), 4000);
  };

  const handleOpenEditModal = (article: StockMaster) => {
    if (!currentUser || currentUser.role !== 'admin') {
      setLoginError('Administrator privileges are required to edit Master items. Please login as admin.');
      setIsLoginModalOpen(true);
      return;
    }
    setEditingArticle(article);
    setArticleForm({ 
      ...article
    });
    setIsArticleModalOpen(true);
  };

  const handleDeleteArticle = (articleNumber: string) => {
    console.log("handleDeleteArticle called with:", articleNumber);
    if (!currentUser || currentUser.role !== 'admin') {
      setLoginError('Administrator privileges are required to delete Master items. Please login as admin.');
      setIsLoginModalOpen(true);
      return;
    }

    const article = db.stockMaster.find(item => item.article_number === articleNumber);
    setConfirmDeleteModal({
      isOpen: true,
      type: 'article',
      id: articleNumber,
      title: 'Delete Article Spec',
      description: `Are you sure you want to delete "${article?.description || articleNumber}" from Delhi Station Stock? This will permanently remove its master specifications, shelf locations, stocktaking logs, and purchase orders.`
    });
  };

  const handleConfirmDeletion = () => {
    const { type, id } = confirmDeleteModal;
    if (type === 'article') {
      const articleNumber = id;
      const nextMaster = db.stockMaster.filter(item => item.article_number !== articleNumber);
      const nextLogs = db.stockTakingLog.filter(log => log.article_number !== articleNumber);
      const nextPOs = db.purchaseOrders.filter(po => po.article_number !== articleNumber);

      if (articleNumber) {
        deleteStockMasterFromFirestore(articleNumber);
        db.stockTakingLog.filter(log => log.article_number === articleNumber).forEach(l => deleteStockLogFromFirestore(l.log_id));
        db.purchaseOrders.filter(po => po.article_number === articleNumber).forEach(p => deletePurchaseOrderFromFirestore(p.po_number));
      }

      updateDb({
        stockMaster: nextMaster,
        stockTakingLog: nextLogs,
        purchaseOrders: nextPOs
      });

      if (editingArticle?.article_number === articleNumber) {
        setIsArticleModalOpen(false);
        setEditingArticle(null);
      }
      playBeep();
    } else if (type === 'bulk-articles') {
      const nextMaster = db.stockMaster.filter(item => !selectedArticleNumbers.includes(item.article_number));
      const nextLogs = db.stockTakingLog.filter(log => !selectedArticleNumbers.includes(log.article_number));
      const nextPOs = db.purchaseOrders.filter(po => !selectedArticleNumbers.includes(po.article_number));

      selectedArticleNumbers.forEach(artNum => {
        if (artNum) {
          deleteStockMasterFromFirestore(artNum);
          db.stockTakingLog.filter(log => log.article_number === artNum).forEach(l => deleteStockLogFromFirestore(l.log_id));
          db.purchaseOrders.filter(po => po.article_number === artNum).forEach(p => deletePurchaseOrderFromFirestore(p.po_number));
        }
      });

      updateDb({
        stockMaster: nextMaster,
        stockTakingLog: nextLogs,
        purchaseOrders: nextPOs
      });

      setSelectedArticleNumbers([]);
      playBeep();
    } else if (type === 'location') {
      playBeep();
    }

    setConfirmDeleteModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.article_number || !articleForm.description) {
      alert("Please fill in Article Number and Description.");
      return;
    }

    let nextMaster = [...db.stockMaster];
    const finalArticle: StockMaster = {
      ...articleForm,
      units_per_box: Number(articleForm.units_per_box) || 1,
      boxes_per_pack: Number(articleForm.boxes_per_pack) || 1,
      estimated_monthly_usage: Number(articleForm.estimated_monthly_usage) || 0,
      min_quantity: Number(articleForm.min_quantity) || 0,
      reorder_level: Number(articleForm.reorder_level) || 0,
      max_quantity: Number(articleForm.max_quantity) || 0,
      total_stock_quantity: Number(articleForm.total_stock_quantity) || 0,
      order_frequency_days: Number(articleForm.order_frequency_days) || 30,
      order_volume: Number(articleForm.order_volume) || 10,
      lead_time_days: Number(articleForm.lead_time_days) || 5,
    };

    if (editingArticle) {
      nextMaster = nextMaster.map(item => item.article_number === editingArticle.article_number ? finalArticle : item);
    } else {
      if (db.stockMaster.some(item => item.article_number === finalArticle.article_number)) {
        alert("An article with this ID already exists.");
        return;
      }
      nextMaster.push(finalArticle);
    }

    try {
      // Prioritize saving to Firestore first
      await saveStockMasterToFirestore(finalArticle);
      
      // Update local state only after successful Firestore save
      updateDb({
        ...db,
        stockMaster: nextMaster
      });
      
      setIsArticleModalOpen(false);
      setEditingArticle(null);
      playBeep();
    } catch (err: any) {
      console.error("Firestore save error on article:", err);
      alert(`Error saving article to Firebase: ${err.message || err}. Please check database connection.`);
    }
  };

  // ----------------------------------------------------
  // REORDER / PURCHASE ORDER CREATION
  // ----------------------------------------------------
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setImportedData(jsonData);
      
      const headers = (XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[]) || [];
      setExcelHeaders(headers);

      // Intelligent Auto-Matching of Columns to Fields using Regular Expressions
      const initialMapping: Record<string, string> = {};
      const fieldsToMatch = [
        { key: 'article_number', regex: /article\s*number|article\s*no|item\s*code|sku|article|code/i },
        { key: 'description', regex: /description|desc|item\s*name|name/i },
        { key: 'barcode', regex: /barcode|upc|ean|gtin/i },
        { key: 'total_stock_quantity', regex: /total\s*stock\s*quantity|total\s*stock|stock\s*qty|actual\s*stock|current\s*stock|qty\s*count|stock\s*count/i },
        { key: 'quantity_details', regex: /quantity\s*text|quantity\s*details|qty\s*text|qty\s*details|pkg\s*details|packaging\s*details|quantity|qty/i },
        { key: 'min_order_qty', regex: /min\s*order\s*qty|minimum\s*order|min\s*order|min\s*po|moq/i },
        { key: 'add_info', regex: /add\s*info|additional\s*info|notes|remarks|remark|free\s*text|comment|comments/i },
        { key: 'smallest_unit_name', regex: /unit\s*name|smallest\s*unit|unit|uom/i },
        { key: 'units_per_box', regex: /units\s*per\s*box|units\/box|unit\s*per\s*box|qty\s*per\s*box/i },
        { key: 'boxes_per_pack', regex: /boxes\s*per\s*pack|boxes\/pack|box\s*per\s*pack/i },
        { key: 'estimated_monthly_usage', regex: /estimated\s*monthly\s*usage|monthly\s*usage|usage|demand/i },
        { key: 'min_quantity', regex: /min\s*quantity|minimum\s*qty|min\s*qty|min/i },
        { key: 'reorder_level', regex: /reorder\s*level|reorder\s*point|reorder|rop/i },
        { key: 'max_quantity', regex: /max\s*quantity|maximum\s*qty|max\s*qty|max/i },
        { key: 'order_frequency_days', regex: /order\s*frequency|frequency|days/i },
        { key: 'order_volume', regex: /order\s*volume|order\s*qty|quantity\s*to\s*order|volume/i },
        { key: 'ordering_channel', regex: /ordering\s*channel|channel|source/i },
        { key: 'lead_time_days', regex: /lead\s*time|leadtime|days/i },
        { key: 'location', regex: /location|area|room|bin|site/i },
      ];
      
      fieldsToMatch.forEach(f => {
        const matchedHeader = headers.find(h => typeof h === 'string' && f.regex.test(h.trim()));
        if (matchedHeader) {
          initialMapping[f.key] = matchedHeader;
        }
      });
      setColumnMapping(initialMapping);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleQuickOrder = (article: StockMaster) => {
    setQuickOrderArticle(article);
    setQuickOrderQty(article.order_volume);
    setIsQuickOrderModalOpen(true);
  };

  const performQuickOrder = () => {
    if (!quickOrderArticle) return;
    if (quickOrderQty <= 0) {
      setQuantityError('Quantity must be greater than 0');
      return;
    }
    setQuantityError('');
    setIsQuickOrderModalOpen(false);

    const poNum = `PO-2026-${String(db.purchaseOrders.length + 1).padStart(3, '0')}`;
    const orderDate = simulatedDate;
    
    // Add lead time
    const expectedDel = new Date(orderDate);
    expectedDel.setDate(expectedDel.getDate() + quickOrderArticle.lead_time_days);
    const expectedDelStr = expectedDel.toISOString().split('T')[0];

    const newPO: PurchaseOrder = {
      po_number: poNum,
      article_number: quickOrderArticle.article_number,
      order_date: orderDate,
      expected_delivery_date: expectedDelStr,
      order_quantity_units: quickOrderQty,
      status: 'Raised'
    };

    updateDb({
      ...db,
      purchaseOrders: [...db.purchaseOrders, newPO]
    });
    savePurchaseOrderToFirestore(newPO).catch(err => console.error("Firestore PO save error:", err));

    playBeep();
    setSelectedPOWorkflow(newPO);
  };

  const handleGenerateBulkPOs = () => {
    if (selectedReorders.length === 0) {
      alert("Please select at least one item to generate bulk POs.");
      return;
    }

    let currentLength = db.purchaseOrders.length;
    const newPOs: PurchaseOrder[] = selectedReorders.map((articleNumber, i) => {
      const article = db.stockMaster.find(m => m.article_number === articleNumber);
      if (!article) return null;

      const suggestedQty = Math.max(article.order_volume, article.max_quantity - article.total_stock_quantity);
      const qty = overrideReorderQtys[articleNumber] ?? suggestedQty;

      const poNum = `PO-2026-${String(currentLength + 1 + i).padStart(3, '0')}`;
      const orderDate = simulatedDate;
      const expectedDel = new Date(orderDate);
      expectedDel.setDate(expectedDel.getDate() + article.lead_time_days);
      const expectedDelStr = expectedDel.toISOString().split('T')[0];

      return {
        po_number: poNum,
        article_number: articleNumber,
        order_date: orderDate,
        expected_delivery_date: expectedDelStr,
        order_quantity_units: qty,
        status: 'Raised'
      };
    }).filter((x): x is PurchaseOrder => x !== null);

    updateDb({
      ...db,
      purchaseOrders: [...db.purchaseOrders, ...newPOs]
    });
    newPOs.forEach(po => savePurchaseOrderToFirestore(po).catch(err => console.error("Firestore PO save error:", err)));

    playBeep();
    alert(`Successfully generated ${newPOs.length} Purchase Orders in 'Raised' status! Please go to 'Orders' tab to approve or reject them.`);
    setSelectedReorders([]);
    setOverrideReorderQtys({});
  };

  const handleCreateManualPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPOForm.article_number) return;

    const qty = Number(manualPOForm.order_quantity_units);
    if (!qty || qty <= 0) {
      setQuantityError('Quantity must be greater than 0');
      return;
    }
    setQuantityError('');
    const article = db.stockMaster.find(m => m.article_number === manualPOForm.article_number);
    if (!article) return;

    const poNum = `PO-2026-${String(db.purchaseOrders.length + 1).padStart(3, '0')}`;
    const orderDate = simulatedDate;
    
    const expectedDel = new Date(orderDate);
    expectedDel.setDate(expectedDel.getDate() + Number(manualPOForm.lead_time_days));
    const expectedDelStr = expectedDel.toISOString().split('T')[0];

    const newPO: PurchaseOrder = {
      po_number: poNum,
      article_number: article.article_number,
      order_date: orderDate,
      expected_delivery_date: expectedDelStr,
      order_quantity_units: qty,
      status: 'Raised'
    };

    updateDb({
      ...db,
      purchaseOrders: [...db.purchaseOrders, newPO]
    });
    savePurchaseOrderToFirestore(newPO).catch(err => console.error("Firestore PO save error:", err));

    playBeep();
    setIsManualPOModalOpen(false);
    setSelectedPOWorkflow(newPO);
  };

  const handleExportToExcel = () => {
    const headers = [
      "Article No",
      "Item",
      "CUPBOARD NO",
      "SHELF",
      "Quantity",
      "Min order Qty",
      "Ordering Channel",
      "Estimated Delivery Time",
      "No of Units in Box",
      "No of Boxes in Pack",
      "Cost per Pack",
      "Min Qty",
      "Max Qty",
      "Reordering Level in Units",
      "Monthly Unit consumption",
      "Barcode",
      "Current Stock (Units)",
      "Reorder Status",
      "Pending PO Numbers"
    ];

    const parseLocation = (locStr: string | undefined) => {
      if (!locStr || !locStr.trim()) return { cupboard: '', shelf: '' };
      const str = locStr.trim();
      if (str.includes(' - ')) {
        const parts = str.split(' - ');
        return { cupboard: parts[0].trim(), shelf: parts.slice(1).join(' - ').trim() };
      }
      if (str.includes(' / ')) {
        const parts = str.split(' / ');
        return { cupboard: parts[0].trim(), shelf: parts.slice(1).join(' / ').trim() };
      }
      if (str.includes(',')) {
        const parts = str.split(',');
        return { cupboard: parts[0].trim(), shelf: parts.slice(1).join(', ').trim() };
      }
      const shelfMatch = str.match(/^(.*?)(shelf.*)$/i);
      if (shelfMatch && shelfMatch[1].trim()) {
        return { cupboard: shelfMatch[1].trim(), shelf: shelfMatch[2].trim() };
      }
      return { cupboard: str, shelf: '' };
    };

    const rows = filteredArticles.map(article => {
      const { cupboard, shelf } = parseLocation(article.location);

      const activePOs = db.purchaseOrders
        .filter(po => po.article_number === article.article_number && (po.status === 'Raised' || po.status === 'Approved'))
        .map(po => `${po.po_number} (${po.status})`)
        .join(', ') || "None";

      const deliveryTime = article.lead_time_days ? `${article.lead_time_days} Days` : "";

      return [
        article.article_number,
        article.description,
        cupboard,
        shelf,
        article.quantity_details || "",
        article.min_order_qty || "",
        article.ordering_channel || "Local",
        deliveryTime,
        article.units_per_box ?? 1,
        article.boxes_per_pack ?? 1,
        article.add_info || "",
        article.min_quantity ?? 0,
        article.max_quantity ?? 0,
        article.reorder_level ?? 0,
        article.estimated_monthly_usage ?? 0,
        article.barcode || "",
        article.currentStock ?? article.total_stock_quantity ?? 0,
        article.statusLabel || "OK",
        activePOs
      ];
    });

    // Generate CSV string with proper encoding and escaping
    const escapeCsvCell = (cell: any) => {
      const cellStr = String(cell ?? '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    };

    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\n');

    // Create a blob and download it
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Delhi_Station_Inventory_Report_${simulatedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSelectedReorders = () => {
    const headers = [
      "Article Number",
      "Item Description",
      "Current Stock",
      "Reorder Level",
      "Suggested Quantity (Smallest Units)",
      "Target Quantity (Smallest Units)",
      "Packaging Breakdown (Packs / Boxes / Units)",
      "Ordering Channel",
      "Lead Time (Days)"
    ];

    const itemsToExport = suggestedOrders.filter(o => selectedReorders.includes(o.article_number));
    if (itemsToExport.length === 0) {
      alert("Please select at least one item from the Automated Next Order Generator queue to export.");
      return;
    }

    const rows = itemsToExport.map(article => {
      const suggestedQty = Math.max(article.order_volume, article.max_quantity - article.currentStock);
      const targetQty = overrideReorderQtys[article.article_number] ?? suggestedQty;
      const { packs, boxes, pieces } = getPackagingBreakdown(
        targetQty,
        article.units_per_box,
        article.boxes_per_pack,
        article.smallest_unit_name
      );
      const breakdownText = `${packs} Packs, ${boxes} Boxes, ${pieces} ${article.smallest_unit_name}s`;

      return [
        article.article_number,
        article.description,
        article.currentStock,
        article.reorder_level,
        suggestedQty,
        targetQty,
        breakdownText,
        article.ordering_channel,
        article.lead_time_days
      ];
    });

    const escapeCsvCell = (cell: any) => {
      const cellStr = String(cell ?? '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    };

    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Delhi_Station_Selected_Reorder_Queue_${simulatedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCreatedPOs = () => {
    const headers = [
      "PO Number",
      "Article Number",
      "Item Description",
      "Order Quantity (Smallest Units)",
      "Packaging Breakdown (Packs / Boxes / Units)",
      "Ordering Channel (Central Ordering Team / Local)",
      "Order Date",
      "Expected Delivery Date",
      "PO Status"
    ];

    const rows = db.purchaseOrders.map(po => {
      const article = db.stockMaster.find(m => m.article_number === po.article_number);
      const desc = article ? article.description : "Unknown";
      const channel = article ? article.ordering_channel : "Unknown";
      
      let breakdownText = "N/A";
      if (article) {
        const { packs, boxes, pieces } = getPackagingBreakdown(
          po.order_quantity_units,
          article.units_per_box,
          article.boxes_per_pack,
          article.smallest_unit_name
        );
        breakdownText = `${packs} Packs, ${boxes} Boxes, ${pieces} ${article.smallest_unit_name}s`;
      }

      return [
        po.po_number,
        po.article_number,
        desc,
        po.order_quantity_units,
        breakdownText,
        channel,
        po.order_date,
        po.expected_delivery_date || "N/A",
        po.status
      ];
    });

    const escapeCsvCell = (cell: any) => {
      const cellStr = String(cell ?? '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    };

    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Delhi_Station_PO_Manifest_${simulatedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePOStateChange = (po: PurchaseOrder, newStatus: POStatus) => {
    let updatedPO = { ...po, status: newStatus };
    if (newStatus === 'Approved') {
      const article = db.stockMaster.find(m => m.article_number === po.article_number);
      const leadTime = article ? article.lead_time_days : 5;
      const todayStr = simulatedDate;
      const expDel = new Date(todayStr + 'T00:00:00');
      expDel.setDate(expDel.getDate() + leadTime);
      updatedPO = {
        ...updatedPO,
        approval_date: todayStr,
        expected_delivery_date: expDel.toISOString().split('T')[0]
      };
    }

    // If Rejected, we delete the order record to remain in the reorder queue with active alerts
    if (newStatus === 'Rejected') {
      deletePurchaseOrderFromFirestore(po.po_number);
    } else {
      savePurchaseOrderToFirestore(updatedPO).catch(err => console.error("Firestore PO state update error:", err));
    }
    const updatedPOs = newStatus === 'Rejected'
      ? db.purchaseOrders.filter(p => p.po_number !== po.po_number)
      : db.purchaseOrders.map(p => p.po_number === po.po_number ? updatedPO : p);

    updateDb({
      ...db,
      purchaseOrders: updatedPOs
    });
    playBeep();
    if (newStatus === 'Rejected') {
      setSelectedPOWorkflow(null);
    } else {
      if (selectedPOWorkflow && selectedPOWorkflow.po_number === po.po_number) {
        setSelectedPOWorkflow(updatedPO);
      }
    }
  };

  const handleOpenReceivePrompt = (po: PurchaseOrder) => {
    setPoToReceive(po);
    setReceiveQty(po.order_quantity_units);
    setIsReceivePromptOpen(true);
    playBeep();
  };

  const handleConfirmReceive = (po: PurchaseOrder, quantityReceived: number) => {
    const updatedStockMaster = db.stockMaster.map(article => {
      if (article.article_number === po.article_number) {
        return {
          ...article,
          total_stock_quantity: article.total_stock_quantity + quantityReceived
        };
      }
      return article;
    });

    const updatedPO: PurchaseOrder = { ...po, status: 'Received', order_quantity_units: quantityReceived };
    
    // Add pending PO if partial
    const pendingPOs: PurchaseOrder[] = [];
    if (po.order_quantity_units > quantityReceived) {
        pendingPOs.push({
            ...po,
            po_number: `${po.po_number}-P`,
            status: 'Pending',
            order_quantity_units: po.order_quantity_units - quantityReceived
        });
    }

    const updatedPOs = db.purchaseOrders.map(p => 
      p.po_number === po.po_number ? updatedPO : p
    );

    updateDb({
      ...db,
      purchaseOrders: [...updatedPOs, ...pendingPOs],
      stockMaster: updatedStockMaster
    });

    // Save updates to Firestore
    savePurchaseOrderToFirestore(updatedPO).catch(err => console.error("Firestore PO update on receive error:", err));
    pendingPOs.forEach(p => savePurchaseOrderToFirestore(p).catch(err => console.error("Firestore pending PO save error:", err)));
    const receivedItem = updatedStockMaster.find(article => article.article_number === po.article_number);
    if (receivedItem) {
      saveStockMasterToFirestore(receivedItem).catch(err => console.error("Firestore stockMaster update on receive error:", err));
    }

    playBeep();
    if (selectedPOWorkflow && selectedPOWorkflow.po_number === po.po_number) {
      setSelectedPOWorkflow(updatedPO);
    }
  };

  const handleRejectDelivery = (po: PurchaseOrder) => {
    deletePurchaseOrderFromFirestore(po.po_number);
    const updatedPOs = db.purchaseOrders.filter(p => p.po_number !== po.po_number);
    updateDb({
      ...db,
      purchaseOrders: updatedPOs
    });
    playBeep();
    if (selectedPOWorkflow && selectedPOWorkflow.po_number === po.po_number) {
      setSelectedPOWorkflow(null);
    }
  };

  const handleReceivePO = (po: PurchaseOrder) => {
    handleOpenReceivePrompt(po);
  };

  const [isBarcodeTagsModalOpen, setIsBarcodeTagsModalOpen] = useState(false);

  // ----------------------------------------------------
  // DERIVED COMPUTATIONS & ANALYTICS
  // ----------------------------------------------------
  
  // 1. Compute dynamic current stock for each item based on last count date, monthly consumption, and scenario offset
  const evaluatedArticles = useMemo(() => {
    return db.stockMaster.map(article => {
      // Detailed stock estimation based on date of stock entered + scenario offset
      const estimation = getDetailedStockEstimation(
        article,
        simulatedDate,
        scenarioDaysOffset,
        db.stockTakingLog,
        db.stockMaster
      );

      const dynamicCurrentStock = estimation.projectedStockUnits;
      const dailyBurn = estimation.dailyBurnRate;

      // Evaluate suppression status
      const suppression = evaluateSuppression(article, dynamicCurrentStock, db.purchaseOrders, simulatedDate);

      let statusLabel: 'Healthy' | 'Low' | 'Action Needed' | 'Suppressed' = 'Healthy';
      if (dynamicCurrentStock <= article.reorder_level) {
        statusLabel = suppression.isSuppressed ? 'Suppressed' : 'Action Needed';
      }
      if (dynamicCurrentStock <= article.min_quantity && !suppression.isSuppressed) {
        statusLabel = 'Low';
      }

      return {
        ...article,
        currentStock: dynamicCurrentStock,
        expectedStock: estimation.projectedStockUnits,
        dailyBurn,
        estimation,
        suppression,
        statusLabel
      };
    });
  }, [db, simulatedDate, scenarioDaysOffset]);

  // KPIs
  const kpis = useMemo(() => {
    const total = evaluatedArticles.length;
    const actionNeeded = evaluatedArticles.filter(a => a.statusLabel === 'Action Needed' || a.statusLabel === 'Low').length;
    const suppressed = evaluatedArticles.filter(a => a.statusLabel === 'Suppressed').length;
    const low = evaluatedArticles.filter(a => a.statusLabel === 'Low').length;
    const healthy = evaluatedArticles.filter(a => a.statusLabel === 'Healthy').length;
    const belowLeadTime = evaluatedArticles.filter(a => a.estimation.isBelowLeadTime).length;

    return { total, actionNeeded, suppressed, low, healthy, belowLeadTime };
  }, [evaluatedArticles]);

  // Unique stock locations for filtering and grouping
  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    db.stockMaster.forEach(item => {
      const loc = item.location && item.location.trim() ? item.location.trim() : 'UNALLOCATED';
      locs.add(loc);
    });
    return Array.from(locs).sort((a, b) => {
      if (a === 'UNALLOCATED') return 1;
      if (b === 'UNALLOCATED') return -1;
      return a.localeCompare(b);
    });
  }, [db.stockMaster]);

  // Filtered Articles list
  const filteredArticles = useMemo(() => {
    return evaluatedArticles.filter(article => {
      const matchesSearch = (article.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (article.article_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (article.barcode || '').includes(searchQuery) ||
                            (article.location && (article.location || '').toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesChannel = channelFilter === 'All' ||
        (channelFilter === 'Central' && article.ordering_channel === 'Central Ordering Team') ||
        (channelFilter === 'Local' && article.ordering_channel === 'Local');

      const matchesStock = stockFilter === 'All' ||
        (stockFilter === 'Healthy' && (article.statusLabel === 'Healthy' || article.total_stock_quantity > article.reorder_level)) ||
        (stockFilter === 'Low' && article.statusLabel === 'Low') ||
        (stockFilter === 'Action Needed' && (article.statusLabel === 'Action Needed' || article.statusLabel === 'Low')) ||
        (stockFilter === 'Suppressed' && (article.statusLabel === 'Suppressed' || article.suppression.isSuppressed)) ||
        (stockFilter === 'Below Lead Days' && article.estimation.isBelowLeadTime);

      const itemLoc = article.location && article.location.trim() ? article.location.trim() : 'UNALLOCATED';
      const matchesLocation = locationFilter === 'All' || itemLoc.toLowerCase() === locationFilter.toLowerCase();

      return matchesSearch && matchesChannel && matchesStock && matchesLocation;
    });
  }, [evaluatedArticles, searchQuery, channelFilter, stockFilter, locationFilter]);

  // Grouped articles by Location
  const articlesByLocation = useMemo(() => {
    const groups: Record<string, typeof filteredArticles> = {};
    filteredArticles.forEach(article => {
      const loc = article.location && article.location.trim() ? article.location.trim() : 'UNALLOCATED';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(article);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'UNALLOCATED') return 1;
      if (b === 'UNALLOCATED') return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(loc => ({
      location: loc,
      articles: groups[loc],
      totalUnits: groups[loc].reduce((sum, item) => sum + (item.currentStock ?? 0), 0)
    }));
  }, [filteredArticles]);

  // Automated Next Order Generator Engine
  const suggestedOrders = useMemo(() => {
    return evaluatedArticles.filter(article => {
      const dailyBurn = article.dailyBurn;
      const daysUntilZero = dailyBurn > 0 ? (article.currentStock / dailyBurn) : 9999;
      
      // Calculate days since last PO
      const itemPOs = db.purchaseOrders
        .filter(po => po.article_number === article.article_number)
        .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
      
      let daysSinceLastPO = 9999;
      if (itemPOs.length > 0) {
        const lastPO = itemPOs[0];
        const msDiff = new Date(simulatedDate).getTime() - new Date(lastPO.order_date).getTime();
        daysSinceLastPO = Math.max(0, msDiff / (1000 * 60 * 60 * 24));
      }

      const activePO = article.suppression.activePO;
      const hasNoActivePO = !activePO;

      const condition1 = article.currentStock <= article.reorder_level;
      const condition2 = daysUntilZero <= article.lead_time_days;
      const condition3 = daysSinceLastPO >= article.order_frequency_days && article.currentStock <= (article.reorder_level * 1.1);

      return (condition1 || condition2 || condition3) && hasNoActivePO;
    });
  }, [evaluatedArticles, db.purchaseOrders, simulatedDate]);

  if (!isMounted) return null;

  if (!currentUser) {
    return (
      <>
        <PublicSearch 
          stockMaster={db.stockMaster} 
          stockTakingLog={db.stockTakingLog}
          purchaseOrders={db.purchaseOrders}
          onLoginClick={() => setIsLoginModalOpen(true)}
        />
        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-base text-slate-900">
                    Sign In to DELSM
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setLoginError('');
                    setLoginUsername('');
                    setLoginPassword('');
                  }}
                  className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
                >
                  &times;
                </button>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold leading-normal flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div>{loginError}</div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-xs"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginModalOpen(false);
                      setLoginError('');
                      setLoginUsername('');
                      setLoginPassword('');
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg transition shadow-sm hover:shadow"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div id="delhi-station-app" className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans border-8 border-slate-900 selection:bg-orange-100 selection:text-orange-900">
      
      {/* ----------------------------------------------------
          GEOMETRIC BALANCE DESIGN: HEADER
          ---------------------------------------------------- */}
      <header id="top-header" className="h-16 flex items-center justify-between px-6 bg-slate-900 text-white shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-bold text-slate-200 transition cursor-pointer focus:outline-none"
            title={isSidebarVisible ? "Hide Navigation Menu" : "Unhide Navigation Menu"}
          >
            <Menu className="w-4 h-4 text-orange-500" />
            <span className="hidden xs:inline">{isSidebarVisible ? "Hide Menu" : "Show Menu"}</span>
          </button>
          <div id="delsm-logo-badge" className="bg-blue-800 border border-blue-700 px-3 py-1.5 rounded font-black text-sm tracking-widest text-white uppercase select-none shrink-0 shadow-inner">
            DELSM
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Delhi Station <span className="text-slate-400 font-normal text-sm hidden sm:inline">| Smart Inventory</span>
          </h1>
        </div>
        
        {/* Time Machine & Live Sound Controls */}
        <div className="flex gap-4 sm:gap-6 items-center text-sm font-medium">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-md font-mono text-xs">
            <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="text-slate-200 shrink-0">
              {new Date(simulatedDate).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
              })}
            </span>
            <button 
              onClick={() => advanceTime(1)} 
              className="ml-2 px-1.5 py-0.5 bg-slate-700 hover:bg-orange-500 text-white rounded text-[10px] font-sans font-bold transition-all shrink-0" 
              title="Add 1 day"
            >
              +1d
            </button>
            <button 
              onClick={() => advanceTime(7)} 
              className="px-1.5 py-0.5 bg-slate-700 hover:bg-orange-500 text-white rounded text-[10px] font-sans font-bold transition-all shrink-0" 
              title="Add 1 week"
            >
              +7d
            </button>
            {simulatedDate !== '2026-07-20' && (
              <button 
                onClick={resetToToday} 
                className="px-1.5 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-[10px] font-sans font-bold transition-all shrink-0"
              >
                Reset
              </button>
            )}
            <div className="w-[1px] h-3.5 bg-slate-700 mx-1 shrink-0"></div>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className="hover:text-orange-500 transition-colors shrink-0"
              title={soundEnabled ? "Mute alert beep" : "Unmute alert beep"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-orange-500" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>
          
          {/* User Authentication Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsGoogleWorkspaceModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-md transition shadow-sm hover:shadow cursor-pointer focus:outline-none"
              title="Google Sheets & Google Drive Integration"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Google Sheets & Drive</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-md text-xs">
                <div className="flex items-center gap-1.5">
                  {currentUser.role === 'admin' ? (
                    <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                  <span className="font-mono font-bold text-slate-200 uppercase">{currentUser.username}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                    currentUser.role === 'admin' 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="w-[1px] h-3.5 bg-slate-700 mx-1"></div>
                <button 
                  onClick={handleLogout} 
                  className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 font-sans font-bold cursor-pointer focus:outline-none"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setLoginError('');
                  setIsLoginModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-md transition shadow-sm hover:shadow cursor-pointer focus:outline-none"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Status Indicator */}
          <div className="hidden lg:flex flex-col items-end leading-none shrink-0">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Global Status</span>
            <span className="text-green-400 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              System Operational
            </span>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------
          GEOMETRIC BALANCE DESIGN: LAYOUT WRAPPER (SIDEBAR + MAIN)
          ---------------------------------------------------- */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        
        {/* LEFT NAV SIDEBAR */}
        {isSidebarVisible && (
          <nav id="sidebar-nav" className="w-full md:w-60 bg-slate-100 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-4 gap-2 shrink-0">
            <div className="hidden md:block mb-1 px-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Module Control</span>
            </div>
            
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsSidebarVisible(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 justify-between ${
                activeTab === 'dashboard'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${activeTab === 'dashboard' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
                <span>Dashboard</span>
              </div>
              {kpis.actionNeeded > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">
                  {kpis.actionNeeded}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('master');
                setIsSidebarVisible(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 ${
                activeTab === 'master'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'master' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
              <span>Stock Management</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('scanner');
                setIsSidebarVisible(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 ${
                activeTab === 'scanner'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'scanner' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
              <span>Barcode Stocktaking</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('orders');
                setIsSidebarVisible(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 ${
                activeTab === 'orders'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'orders' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
              <span>Purchase Orders</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('analytics');
                setIsSidebarVisible(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 ${
                activeTab === 'analytics'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'analytics' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
              <span>Analytics</span>
            </button>

            <div className="my-1 border-t border-slate-200"></div>

            <button
              onClick={() => {
                setIsGoogleWorkspaceModalOpen(true);
                setIsSidebarVisible(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-all duration-150 shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Google Sheets & Drive</span>
            </button>
          </nav>
        )}

        {/* MAIN BODY SCROLL CONTAINER */}
        <main className="flex-1 flex flex-col p-6 gap-6 bg-[#EDF2F7] overflow-y-auto min-h-0">
          
          {/* TOP ROW: SMART SUMMARY KPI CARDS */}
          {activeTab !== 'dashboard' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              
              {/* Card 1: Action Needed */}
              <button 
                onClick={() => {
                  const targetFilter = 'Action Needed';
                  setStockFilter(stockFilter === targetFilter ? 'All' : targetFilter);
                  if (activeTab !== 'master') {
                    setActiveTab('dashboard');
                  }
                }}
                className={`bg-white border-b-4 border-red-500 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none rounded-xl ${
                  stockFilter === 'Action Needed' ? 'ring-2 ring-red-500 shadow-inner bg-red-50/10' : ''
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                    Action Needed {stockFilter === 'Action Needed' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${stockFilter === 'Action Needed' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}>
                    {stockFilter === 'Action Needed' ? 'FILTER ACTIVE' : 'CRITICAL'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 font-display">{kpis.actionNeeded}</span>
                  <span className="text-xs text-slate-500">Below reorder level</span>
                </div>
              </button>

              {/* Card 2: Approved / Suppressed */}
              <button 
                onClick={() => {
                  const targetFilter = 'Suppressed';
                  setStockFilter(stockFilter === targetFilter ? 'All' : targetFilter);
                  if (activeTab !== 'master') {
                    setActiveTab('dashboard');
                  }
                }}
                className={`bg-white border-b-4 border-amber-500 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none rounded-xl ${
                  stockFilter === 'Suppressed' ? 'ring-2 ring-amber-500 shadow-inner bg-amber-50/10' : ''
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                    Approved / Suppressed {stockFilter === 'Suppressed' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${stockFilter === 'Suppressed' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {stockFilter === 'Suppressed' ? 'FILTER ACTIVE' : 'PENDING RECEIPT'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 font-display">{kpis.suppressed}</span>
                  <span className="text-xs text-slate-500">POs suppressing alerts</span>
                </div>
              </button>

              {/* Card 3: Healthy Stock */}
              <button 
                onClick={() => {
                  const targetFilter = 'Healthy';
                  setStockFilter(stockFilter === targetFilter ? 'All' : targetFilter);
                  if (activeTab !== 'master') {
                    setActiveTab('dashboard');
                  }
                }}
                className={`bg-white border-b-4 border-green-500 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none rounded-xl ${
                  stockFilter === 'Healthy' ? 'ring-2 ring-green-500 shadow-inner bg-green-50/10' : ''
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                    Healthy Stock {stockFilter === 'Healthy' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${stockFilter === 'Healthy' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>
                    {stockFilter === 'Healthy' ? 'FILTER ACTIVE' : 'STABLE'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 font-display">{kpis.healthy}</span>
                  <span className="text-xs text-slate-500">Optimally stocked</span>
                </div>
              </button>

              {/* Card 4: Below Lead Days (Flash Red) */}
              <button 
                onClick={() => {
                  const targetFilter = 'Below Lead Days';
                  setStockFilter(stockFilter === targetFilter ? 'All' : targetFilter);
                }}
                className={`bg-white border-b-4 border-rose-600 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none rounded-xl ${
                  stockFilter === 'Below Lead Days' ? 'ring-2 ring-rose-600 shadow-inner bg-rose-50/20' : ''
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider font-display flex items-center gap-1.5">
                    Below Lead Days {kpis.belowLeadTime > 0 && <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    stockFilter === 'Below Lead Days' ? 'bg-rose-600 text-white' : kpis.belowLeadTime > 0 ? 'animate-flash-red text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {stockFilter === 'Below Lead Days' ? 'FILTER ACTIVE' : kpis.belowLeadTime > 0 ? 'FLASHING RED' : 'SAFE'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-rose-700 font-display">{kpis.belowLeadTime}</span>
                  <span className="text-xs text-slate-500">&le; Lead Days buffer</span>
                </div>
              </button>

            </div>
          )}


          {/* TAB CONTENTS INNER HOLDER */}
          <div className="flex-1 min-h-0">
        
        {/* TAB 1: REORDER DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* INVENTORY ESTIMATION & SCENARIO TOOLBAR */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
                    🔮 Future Consumption Scenario Simulator
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Project stock quantities and remaining days of stock coverage based on last count dates, daily burn rates, and scenario days.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold px-2">Scenario:</span>
                  {[0, 1, 3, 7, 15, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setScenarioDaysOffset(days)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        scenarioDaysOffset === days
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {days === 0 ? 'Actual Stock' : `+${days}d`}
                    </button>
                  ))}
                  <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    placeholder="Custom Days"
                    value={scenarioDaysOffset || ''}
                    onChange={(e) => setScenarioDaysOffset(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 px-2 py-1 text-xs text-center border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
                    title="Enter custom days offset"
                  />
                  <span className="text-[10px] text-slate-400 font-sans font-medium pr-2">days</span>
                </div>
              </div>
              
              {/* Informative stats bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400 font-medium">Projected Date:</span>
                  <input
                    type="date"
                    value={(() => {
                      const d = new Date(simulatedDate + 'T12:00:00');
                      d.setDate(d.getDate() + scenarioDaysOffset);
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      return `${yyyy}-${mm}-${dd}`;
                    })()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setPendingProjDate(val);
                        setIsProjDateModalOpen(true);
                      }
                    }}
                    className="font-bold text-slate-800 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer w-full shadow-sm hover:border-slate-300 transition"
                    title="Edit projected date directly (will prompt and clear values)"
                  />
                </div>
                <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400">Items Below Lead Time Buffer:</span>
                  <span className={`font-bold text-sm mt-1 flex items-center gap-1.5 ${kpis.belowLeadTime > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                    {kpis.belowLeadTime > 0 ? '🚨' : '✅'} {kpis.belowLeadTime} items
                  </span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-400 font-medium">Flash Alerts Rule:</span>
                  <span className="text-slate-500 mt-1 leading-tight">
                    Flashes <span className="text-rose-600 font-bold">RED</span> when remaining cover is <span className="font-bold">&le; Lead Days</span> buffer
                  </span>
                </div>
              </div>
            </div>

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
                    onClick={() => setStockFilter('Below Lead Days')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      stockFilter === 'Below Lead Days'
                        ? 'bg-rose-700 border-rose-800 text-white shadow-inner scale-[0.98]'
                        : 'bg-white hover:bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    <span>🚨 Below Lead Days</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black font-mono ${stockFilter === 'Below Lead Days' ? 'bg-rose-900 text-white' : 'bg-rose-100 text-rose-700'}`}>
                      {kpis.belowLeadTime}
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
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-2 text-xs">
                            <div>
                              <div className="text-slate-400">Current Stock</div>
                              <div className="font-bold text-red-600 font-mono">
                                {(article.currentStock ?? 0).toLocaleString()} {article.smallest_unit_name}s
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-400">Est. Days Left</div>
                              <div className={`font-black font-mono px-1.5 py-0.5 rounded text-center inline-block ${
                                article.estimation.isBelowLeadTime 
                                  ? 'bg-rose-600 text-white animate-flash-red' 
                                  : 'text-slate-700 font-bold'
                              }`}>
                                {article.estimation.daysStockLeft === 999 ? '∞' : `${article.estimation.daysStockLeft} days`}
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

                      const safeCurrentStock = isNaN(Number(article.currentStock)) ? 0 : Number(article.currentStock);
                      const safeDailyBurn = isNaN(Number(article.dailyBurn)) ? 0 : Number(article.dailyBurn);
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

              {/* 4. BELOW LEAD DAYS BUFFER PANEL */}
              {(stockFilter === 'All' || stockFilter === 'Below Lead Days') && (
                <div className="bg-white border border-rose-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="bg-rose-50 px-5 py-4 border-b border-rose-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-800">
                      <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
                      <h3 className="font-bold text-sm uppercase tracking-wider font-display">🚨 Below Lead Days: Critical Delivery Buffer Risk</h3>
                    </div>
                    <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-md font-bold animate-pulse">
                      Estimated Days Left &le; Lead Days
                    </span>
                  </div>
                  
                  <div className="divide-y divide-slate-100">
                    {filteredArticles.filter(a => a.estimation.isBelowLeadTime).length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-rose-50/5">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm">Excellent! No stock items are currently running below their Lead Days buffer time.</p>
                      </div>
                    ) : (
                      filteredArticles.filter(a => a.estimation.isBelowLeadTime).map((article, index) => (
                        <div key={`${article.article_number}-${index}`} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50 transition">
                          <div className="space-y-2 max-w-xl">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded animate-flash-red">
                                {article.article_number}
                              </span>
                              <span className="font-bold text-slate-800 text-left">
                                {article.description}
                              </span>
                              <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                                {article.estimation.daysStockLeft} Days Left
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
                                <div className="text-slate-400">Supplier Lead Time</div>
                                <div className="font-bold text-red-700 font-mono">
                                  {article.lead_time_days} Days
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-400">Daily Burn Rate</div>
                                <div className="font-bold text-slate-700 font-mono">
                                  {article.dailyBurn.toFixed(1)} / day
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-400 font-mono text-[10px]">Min / Reorder</div>
                                <div className="font-bold text-slate-700 font-mono">
                                  {article.min_quantity} / {article.reorder_level}
                                </div>
                              </div>
                            </div>

                            <div className="text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-xs flex items-center gap-2">
                              <span>⚠️</span>
                              <span>
                                <strong>Lead Time Risk Alert</strong>: This item has {article.estimation.daysStockLeft} days of stock remaining, which is less than or equal to the {article.lead_time_days} days required for delivery.
                              </span>
                            </div>
                          </div>

                          {/* Quick action button */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center gap-4 shrink-0">
                            <div>
                              <div className="text-[10px] uppercase font-bold text-slate-400">Reorder Volume</div>
                              <div className="text-sm font-mono font-bold text-slate-700">{(article.order_volume ?? 0).toLocaleString()} units</div>
                              <div className="text-[10px] text-slate-500">Route: {article.ordering_channel}</div>
                            </div>
                            <button
                              onClick={() => handleQuickOrder(article)}
                              className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" /> Fast Order Now
                            </button>
                          </div>
                        </div>
                      ))
                    )}
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
                                            value={isNaN(currentVal) ? '' : currentVal}
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
                                          savePurchaseOrderToFirestore(newPO).catch(err => console.error("Firestore PO save error:", err));

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

        {/* TAB 2: MASTER STOCK MANAGEMENT */}
        {activeTab === 'master' && (
          <div className="space-y-6">
            
            {/* COLLAPSIBLE HEADER SECTION: DELHI STATION STOCK */}
            <div id="delhi-station-stock-collapsible" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200">
              {/* Header bar / Summary bar with Three Bars (Menu) toggle */}
              <div 
                onClick={() => setIsStockHeaderExpanded(!isStockHeaderExpanded)}
                className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      Delhi Station Stock
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {isStockHeaderExpanded ? "Click to collapse stock management controls" : "Click three bars to expand buttons & management controls"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold bg-slate-200/80 text-slate-700 px-2.5 py-1 rounded-full">
                    {filteredArticles.length} Master Items
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsStockHeaderExpanded(!isStockHeaderExpanded);
                    }}
                    className="p-2 bg-white hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 hover:text-slate-900 transition shadow-sm focus:outline-none flex items-center gap-1 cursor-pointer"
                    title={isStockHeaderExpanded ? "Collapse Delhi Station Stock section" : "Expand Delhi Station Stock section"}
                  >
                    <Menu className={`w-4.5 h-4.5 text-orange-500 transition-transform duration-200 ${isStockHeaderExpanded ? 'rotate-90' : ''}`} />
                    <span className="text-[11px] font-bold hidden sm:inline">
                      {isStockHeaderExpanded ? "Collapse" : "Expand"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Expandable Panel */}
              {isStockHeaderExpanded && (
                <div className="p-5 bg-white border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Delhi Station Master Stock Controls</h3>
                      <p className="text-xs text-slate-500">Add, edit, and define unit conversions and thresholds for inventory parts.</p>
                    </div>
                    <div className="flex gap-2.5 self-start flex-wrap">
                      <button
                        onClick={() => setIsBarcodeTagsModalOpen(true)}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer focus:outline-none"
                        title="Generate and print barcode tags for all inventory items"
                      >
                        <Barcode className="w-3.5 h-3.5" /> Generate Bar Codes
                      </button>
                      <button
                        onClick={handleExportToExcel}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5"
                        title="Export currently filtered table dataset to Excel / CSV"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Export to Excel
                      </button>
                      <button
                        onClick={() => setIsGoogleWorkspaceModalOpen(true)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer focus:outline-none"
                        title="Export to Google Sheets or Backup to Google Drive"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Google Sheets / Drive Sync
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
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedArticleNumbers.length})
                        </button>
                      )}
                      {selectedArticleNumbers.length === 1 && currentUser?.role === 'admin' && (
                        <button
                          onClick={() => {
                              const article = db.stockMaster.find(m => m.article_number === selectedArticleNumbers[0]);
                              if(article) handleOpenEditModal(article);
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit Selected
                        </button>
                      )}
                      {currentUser?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => setStockViewMode(stockViewMode === 'gridEdit' ? 'table' : 'gridEdit')}
                            className={`font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer ${
                              stockViewMode === 'gridEdit'
                                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                            title="Toggle Excel Spreadsheet Style Quick Grid Edit Mode"
                          >
                            <TableProperties className="w-3.5 h-3.5" />
                            <span>{stockViewMode === 'gridEdit' ? 'Exit Grid Mode' : 'Edit in Grid View'}</span>
                          </button>

                          <button
                            onClick={() => setIsExcelImportModalOpen(true)}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" /> Import from Excel
                          </button>
                          <button
                            onClick={handleOpenAddModal}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Master Item
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 ml-auto flex-wrap gap-0.5">
                  <button
                    onClick={() => setStockViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      stockViewMode === 'table'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Standard Data Grid Table View"
                  >
                    <List className="w-3.5 h-3.5 text-slate-500" /> Table
                  </button>

                  <button
                    onClick={() => setStockViewMode('spreadsheetView')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      stockViewMode === 'spreadsheetView'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-indigo-700 hover:bg-indigo-50/50'
                    }`}
                    title="Read-Only Spreadsheet View"
                  >
                    <TableProperties className={`w-3.5 h-3.5 ${stockViewMode === 'spreadsheetView' ? 'text-white' : 'text-indigo-500'}`} /> Spreadsheet View
                  </button>

                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => setStockViewMode('gridEdit')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                        stockViewMode === 'gridEdit'
                          ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                          : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'
                      }`}
                      title="Excel-like Quick Grid Edit Mode (Inline spreadsheet updates for multiple items)"
                    >
                      <FileSpreadsheet className={`w-3.5 h-3.5 ${stockViewMode === 'gridEdit' ? 'text-white' : 'text-emerald-500'}`} /> Excel Quick Edit
                    </button>
                  )}

                  <button
                    onClick={() => setStockViewMode('grouped')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      stockViewMode === 'grouped'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Group Stock by Location"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> Group by Location
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
               <div className="flex flex-wrap items-center gap-3 p-3 px-4 bg-amber-50 border-t border-b border-amber-200 text-xs">
                 <span className="font-bold text-amber-900">
                   Bulk Actions ({selectedArticleNumbers.length} selected):
                 </span>
                 <button
                   onClick={() => setStockViewMode('gridEdit')}
                   className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-2xs"
                 >
                   <TableProperties className="w-3.5 h-3.5" /> Edit Selected in Excel Grid Mode
                 </button>
                 <button
                   className="bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-rose-700 transition cursor-pointer shadow-2xs"
                   onClick={() => {
                     setConfirmDeleteModal({
                       isOpen: true,
                       type: 'bulk-articles',
                       id: 'bulk',
                       title: 'Bulk Delete Articles',
                       description: `Are you sure you want to delete ${selectedArticleNumbers.length} selected articles?`
                     });
                   }}
                 >
                   Delete Selected
                 </button>
               </div>
             )}

            {/* Render View: Excel Grid Edit vs Grouped by Location vs Standard Table */}
            {stockViewMode === 'gridEdit' || stockViewMode === 'spreadsheetView' ? (
              <ExcelStockGrid
                filteredArticles={filteredArticles}
                selectedArticleNumbers={selectedArticleNumbers}
                setSelectedArticleNumbers={setSelectedArticleNumbers}
                gridEdits={gridEdits}
                setGridEdits={setGridEdits}
                gridAutoSave={gridAutoSave}
                setGridAutoSave={setGridAutoSave}
                gridSavedToast={gridSavedToast}
                setGridSavedToast={setGridSavedToast}
                gridSaveError={gridSaveError}
                setGridSaveError={setGridSaveError}
                isBatchSavingGrid={isBatchSavingGrid}
                batchLocationInput={batchLocationInput}
                setBatchLocationInput={setBatchLocationInput}
                uniqueLocations={uniqueLocations}
                handleGridCellChange={handleGridCellChange}
                handleSaveGridRow={handleSaveGridRow}
                handleSaveAllGridEdits={handleSaveAllGridEdits}
                handleDiscardGridRow={handleDiscardGridRow}
                handleDiscardAllGridEdits={handleDiscardAllGridEdits}
                handleBulkApplyLocation={handleBulkApplyLocation}
                onExitGridMode={() => setStockViewMode('table')}
                viewOnly={stockViewMode === 'spreadsheetView'}
              />
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
                                Total Stock Quantity: <span className="text-amber-400 font-bold">{(group.totalUnits ?? 0).toLocaleString()}</span> units
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
                                  <th className="p-4">Article & Details</th>
                                  <th className="p-4">Barcode</th>
                                  <th className="p-4">Packaging Hierarchy</th>
                                   <th className="p-4">Quantity Details</th>
                                  <th className="p-4">Est. Days Left</th>
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
                                    <td className="p-4 max-w-sm">
                                      <div className="flex items-start gap-3">
                                        
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
                                          <div className="text-[11px] text-slate-500 space-y-0.5">
                                            <div>
                                              Current Stock: <strong className="font-mono text-slate-700">
                                                {(article.currentStock ?? 0).toLocaleString()} {article.smallest_unit_name}s
                                              </strong>
                                            </div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-1 flex-wrap mt-0.5">
                                              <span>Est. Coverage:</span>
                                              {article.estimation.isBelowLeadTime ? (
                                                <span className="animate-flash-red text-[10px] font-black px-1.5 py-0.5 rounded text-white font-mono flex items-center gap-0.5">
                                                  🚨 {article.estimation.daysStockLeft} Days (&le; {article.lead_time_days}d Lead)
                                                </span>
                                              ) : (
                                                <strong className="font-mono text-slate-700 font-bold">
                                                  {article.estimation.daysStockLeft === 999 ? '∞' : `${article.estimation.daysStockLeft} Days`}
                                                </strong>
                                              )}
                                            </div>
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
                                      {article.estimation.isBelowLeadTime ? (
                                        <span className="animate-flash-red text-[10px] font-black px-1.5 py-0.5 rounded text-white font-mono flex items-center gap-0.5 w-fit">
                                          🚨 {article.estimation.daysStockLeft} Days
                                        </span>
                                      ) : (
                                        <span className="font-mono text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                          {article.estimation.daysStockLeft === 999 ? '∞' : `${article.estimation.daysStockLeft} Days`}
                                        </span>
                                      )}
                                      {article.estimation.isBelowLeadTime && (
                                        <div className="text-[9px] text-red-500 font-medium mt-0.5">
                                          &le; {article.lead_time_days}d lead
                                        </div>
                                      )}
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
                        <th className="p-4">Article & Details</th>
                        <th className="p-4">Barcode</th>
                        <th className="p-4">Packaging Hierarchy</th>
                        <th className="p-4">Quantity Details</th>
                        <th className="p-4">Est. Days Left</th>
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
                            <td className="p-4 max-w-sm">
                              <div className="flex items-start gap-3">
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
                                  <div className="text-[11px] text-slate-500 space-y-0.5">
                                    <div>
                                      Current Stock: <strong className="font-mono text-slate-700">
                                        {(article.currentStock ?? 0).toLocaleString()} {article.smallest_unit_name}s
                                      </strong>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1 flex-wrap mt-0.5">
                                      <span>Est. Coverage:</span>
                                      {article.estimation.isBelowLeadTime ? (
                                        <span className="animate-flash-red text-[10px] font-black px-1.5 py-0.5 rounded text-white font-mono flex items-center gap-0.5">
                                          🚨 {article.estimation.daysStockLeft} Days (&le; {article.lead_time_days}d Lead)
                                        </span>
                                      ) : (
                                        <strong className="font-mono text-slate-700 font-bold">
                                          {article.estimation.daysStockLeft === 999 ? '∞' : `${article.estimation.daysStockLeft} Days`}
                                        </strong>
                                      )}
                                    </div>
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
                              {article.estimation.isBelowLeadTime ? (
                                <span className="animate-flash-red text-[10px] font-black px-1.5 py-0.5 rounded text-white font-mono flex items-center gap-0.5 w-fit">
                                  🚨 {article.estimation.daysStockLeft} Days
                                </span>
                              ) : (
                                <span className="font-mono text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                  {article.estimation.daysStockLeft === 999 ? '∞' : `${article.estimation.daysStockLeft} Days`}
                                </span>
                              )}
                              {article.estimation.isBelowLeadTime && (
                                <div className="text-[9px] text-red-500 font-medium mt-0.5">
                                  &le; {article.lead_time_days}d lead
                                </div>
                              )}
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

        {/* TAB 3: BARCODE STOCKTAKING MODULE */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
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
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                        <Package className="w-8 h-8 text-slate-400" />
                      </div>
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
                            value={scanPacks === null || scanPacks === undefined || isNaN(scanPacks) ? '' : scanPacks}
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
                            value={scanBoxes === null || scanBoxes === undefined || isNaN(scanBoxes) ? '' : scanBoxes}
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
                            value={scanUnits === null || scanUnits === undefined || isNaN(scanUnits) ? '' : scanUnits}
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
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm min-h-[220px] flex flex-col items-center justify-center">
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
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" /> Recent Stocktakes Log
                    <span className="text-[10px] text-slate-400 font-mono font-normal">({db.stockTakingLog.length})</span>
                  </h3>

                  <button
                    onClick={() => setIsStocktakeLogExpanded(!isStocktakeLogExpanded)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer select-none"
                    title={isStocktakeLogExpanded ? "Collapse Stocktakes Log" : "Expand Stocktakes Log"}
                  >
                    <Menu className="w-4 h-4 text-slate-700" />
                    <span>{isStocktakeLogExpanded ? "Collapse" : "Expand"}</span>
                    {isStocktakeLogExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>

                {isStocktakeLogExpanded ? (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 transition-all duration-200">
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
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 py-1">
                    <span className="italic">{db.stockTakingLog.length} recent audit log entry{db.stockTakingLog.length === 1 ? '' : 's'} recorded.</span>
                    <button
                      onClick={() => setIsStocktakeLogExpanded(true)}
                      className="text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Menu className="w-3.5 h-3.5" /> Show Log
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* EDIT GRID MODE STOCK TABLE SECTION */}
            <div id="barcode-edit-grid-section" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-5 h-5 text-amber-500" /> Barcode Stocktaking Edit Grid Mode
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Directly update current stock, description, location, or packaging specs. Any update is recorded as of the simulation date (<strong className="text-amber-600 font-mono">{simulatedDate}</strong>) and thereafter extrapolated as per daily burn rate.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={gridAutoSave}
                      onChange={(e) => setGridAutoSave(e.target.checked)}
                      className="accent-amber-500 rounded cursor-pointer"
                    />
                    <span className="font-bold">Auto-Sync on Leave</span>
                  </label>
                  
                  {Object.keys(gridEdits).length > 0 && (
                    <button
                      onClick={handleSaveAllGridEdits}
                      disabled={isBatchSavingGrid}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      {isBatchSavingGrid ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save All ({Object.keys(gridEdits).length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar specifically for this Stocktaking grid */}
              <div className="flex items-center gap-2 max-w-md">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="Search article, description, location..."
                    value={scannerGridSearchQuery}
                    onChange={(e) => setScannerGridSearchQuery(e.target.value)}
                    className="w-full text-xs border border-slate-200 pl-8 pr-2.5 py-2 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-700"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
                {scannerGridSearchQuery && (
                  <button
                    onClick={() => setScannerGridSearchQuery('')}
                    className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                      <th className="p-3 w-[120px]">Article #</th>
                      <th className="p-3 min-w-[200px]">Description</th>
                      <th className="p-3 w-[130px]">Location</th>
                      <th className="p-3 min-w-[200px]">Quantity Details</th>
                      <th className="p-3 w-[160px]">Current Stock (Units)</th>
                      <th className="p-3 w-[110px] text-right">Daily Burn</th>
                      <th className="p-3 min-w-[150px] text-right">Extrapolated Status</th>
                      <th className="p-3 w-[90px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(() => {
                      const filtered = evaluatedArticles.filter(article => {
                        const query = scannerGridSearchQuery.toLowerCase();
                        return (
                          (article.description || '').toLowerCase().includes(query) ||
                          (article.article_number || '').toLowerCase().includes(query) ||
                          (article.location || '').toLowerCase().includes(query) ||
                          (article.barcode || '').toLowerCase().includes(query)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">
                              No matching items found for &quot;{scannerGridSearchQuery}&quot;.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(article => {
                        const rowEdit = gridEdits[article.article_number] || {};
                        const isModified = Object.keys(rowEdit).length > 0;
                        
                        const desc = rowEdit.description !== undefined ? rowEdit.description : article.description;
                        const loc = rowEdit.location !== undefined ? rowEdit.location : article.location;
                        const qtySpec = rowEdit.quantity_details !== undefined ? rowEdit.quantity_details : article.quantity_details;
                        const stock = rowEdit.currentStock !== undefined ? rowEdit.currentStock : article.currentStock;

                        // Dynamic cover cover
                        const daysCover = article.dailyBurn > 0 ? (stock || 0) / article.dailyBurn : 999;
                        const isBelowLead = article.dailyBurn > 0 && daysCover <= (article.lead_time_days || 0);

                        return (
                          <tr key={article.article_number} className="hover:bg-slate-50/50 transition">
                            <td className="p-3 font-mono font-bold text-slate-900">
                              <div className="flex items-center gap-1">
                                <span>{article.article_number}</span>
                                {isModified && (
                                  <span className="text-[9px] bg-amber-500 text-slate-950 font-extrabold px-1 rounded">MOD</span>
                                )}
                              </div>
                            </td>

                            <td className="p-3">
                              <input
                                type="text"
                                value={desc || ''}
                                onChange={(e) => handleGridCellChange(article.article_number, 'description', e.target.value)}
                                onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                                className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/20 rounded px-2 py-1 font-sans text-xs font-semibold text-slate-800 outline-none transition truncate"
                              />
                            </td>

                            <td className="p-3">
                              <input
                                type="text"
                                list="scanner-grid-locations"
                                value={loc || ''}
                                onChange={(e) => handleGridCellChange(article.article_number, 'location', e.target.value.toUpperCase())}
                                onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                                className="w-full bg-indigo-50/30 hover:bg-indigo-50 focus:bg-white border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/20 rounded px-2 py-1 font-mono text-xs font-bold text-indigo-900 outline-none transition uppercase truncate"
                                placeholder="LOCATION..."
                              />
                              <datalist id="scanner-grid-locations">
                                {uniqueLocations.map(l => (
                                  <option key={l} value={l} />
                                ))}
                              </datalist>
                            </td>

                            <td className="p-3">
                              <input
                                type="text"
                                value={qtySpec || ''}
                                onChange={(e) => handleGridCellChange(article.article_number, 'quantity_details', e.target.value)}
                                onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                                className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/20 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition truncate"
                                placeholder="e.g. 5 boxes x 20 rolls..."
                              />
                            </td>

                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={stock ?? 0}
                                  onChange={(e) => handleGridCellChange(article.article_number, 'currentStock', e.target.value)}
                                  onBlur={() => gridAutoSave && handleSaveGridRow(article)}
                                  className="w-20 bg-amber-50/30 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/20 rounded px-2 py-1 font-mono text-xs font-bold text-slate-900 outline-none text-right transition"
                                />
                                <span className="text-[10px] text-slate-400 font-medium">{article.smallest_unit_name}s</span>
                              </div>
                            </td>

                            <td className="p-3 text-right font-mono text-slate-600">
                              {article.dailyBurn > 0 ? `${article.dailyBurn.toFixed(1)}/day` : '0/day'}
                            </td>

                            <td className="p-3 text-right">
                              {article.dailyBurn > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className={`font-mono font-bold text-xs ${
                                    isBelowLead ? 'text-red-600 animate-pulse' : 'text-slate-800'
                                  }`}>
                                    {daysCover.toFixed(1)} Days left
                                  </span>
                                  <span className="text-[9px] text-slate-400">
                                    {isBelowLead ? `🚨 Risk (Lead: ${article.lead_time_days}d)` : 'Healthy Cover'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-mono italic">∞ No usage</span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              {isModified ? (
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => handleSaveGridRow(article)}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-sm cursor-pointer"
                                    title="Save changes to Firestore & record recount log"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDiscardGridRow(article.article_number)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                                    title="Discard unsaved changes for this row"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 select-none bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded font-bold uppercase">Saved</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PURCHASE ORDERS WORKFLOW */}
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

        {activeTab === 'analytics' && (
          <AnalyticsTab db={db} />
        )}

          </div>
        </main>
      </div>

      {/* ----------------------------------------------------
          FOOTER WITH FORMULA DISCLOSURE
          ---------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-slate-800">Delhi Station Inventory System Specifications</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Crafted with architectural mathematical precision, ensuring standard conversion audits.</p>
            </div>
            <div className="flex gap-4">
              <span className="text-slate-400">Timezone: UTC-7</span>
              <span className="text-slate-400">Environment: Next.js + Tailwind</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[10.5px] leading-relaxed">
            <div>
              <strong className="text-slate-700 block mb-1">A. MULTI-TIER CONVERSION FORMULA</strong>
              <div className="font-mono bg-white p-1.5 rounded border border-slate-200">
                Total Units = (Packs × boxes_per_pack × units_per_box) + (Boxes × units_per_box) + Units
              </div>
            </div>
            <div>
              <strong className="text-slate-700 block mb-1">B. DYNAMIC BURN RATE PREDICTORS</strong>
              <div className="font-mono bg-white p-1.5 rounded border border-slate-200">
                Expected Stock = Q_last - (Days_elapsed × Daily_burn_rate)
              </div>
            </div>
            <div>
              <strong className="text-slate-700 block mb-1">C. SMART LEAD-TIME SUPPRESSIONS</strong>
              <div className="font-mono bg-white p-1.5 rounded border border-slate-200">
                Projected Stock = Q_current - (Days_to_delivery × Daily_burn_rate)
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ----------------------------------------------------
          ADD / EDIT ARTICLE DETAILS DIALOG
          ---------------------------------------------------- */}
      <EditArticleModal
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        editingArticle={editingArticle}
        articleForm={articleForm}
        setArticleForm={setArticleForm}
        handleSaveArticle={handleSaveArticle}
        handleDeleteArticle={handleDeleteArticle}
        currentUser={currentUser}
      />

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
                        { key: 'min_order_qty', label: 'Min Order Qty (Free Text)', required: false, desc: 'Free text description for minimum order quantity e.g. "50 boxes", "1 pack".' },
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
                            mappedItem.min_order_qty = String(item[columnMapping.min_order_qty] ?? '').trim();
                            mappedItem.add_info = String(item[columnMapping.add_info] ?? '').trim();
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
                            let mergedItem: StockMaster;
                            if (existingItemsMap.has(item.article_number)) {
                              mergedItem = { ...existingItemsMap.get(item.article_number), ...item };
                              existingItemsMap.set(item.article_number, mergedItem);
                              updatedCount++;
                            } else {
                              mergedItem = item;
                              existingItemsMap.set(item.article_number, mergedItem);
                              newCount++;
                            }
                            // Save individual imported/updated items to Firestore
                            saveStockMasterToFirestore(mergedItem).catch(err => console.error("Firestore Excel import item save error:", err));
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
        <div id="barcode-modal-backdrop" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div id="barcode-modal-container" className="bg-slate-100 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
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
                @page {
                  size: A4 portrait;
                  margin: 8mm;
                }
                /* Hide main application and all other screen interfaces */
                #delhi-station-app {
                  display: none !important;
                }
                
                html, body {
                  background: #ffffff !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                }
                
                /* Reset modal containers for seamless multipage document flow */
                #barcode-modal-backdrop {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  background: #ffffff !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  z-index: auto !important;
                  display: block !important;
                  box-shadow: none !important;
                  backdrop-filter: none !important;
                }
                
                #barcode-modal-backdrop * {
                  visibility: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }

                #barcode-modal-container {
                  position: static !important;
                  display: block !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: #ffffff !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }

                #barcode-modal-scroll-body {
                  position: static !important;
                  display: block !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  background: #ffffff !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }

                #printable-barcode-sheet {
                  position: static !important;
                  display: grid !important;
                  grid-template-cols: repeat(2, minmax(0, 1fr)) !important;
                  gap: 8mm !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  overflow: visible !important;
                }
                
                #printable-barcode-sheet > div {
                  position: relative !important;
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                  border: 2px solid #cbd5e1 !important;
                  background-color: #ffffff !important;
                  overflow: visible !important;
                  min-height: 190px !important;
                }

                /* Ensure all SVGs and path definitions render perfectly on page-breaks */
                #printable-barcode-sheet svg {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  max-width: 100% !important;
                  height: auto !important;
                }
                
                #printable-barcode-sheet svg * {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
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
                      (item.article_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.barcode || '').includes(searchQuery);
                    return matchesSearch;
                  }).length} items)
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Tip: Use standard Letter or A4 sheets. Labels are sized for 3.5&quot; x 2&quot; label stock.
              </p>
            </div>

            {/* Modal Body / Tag Sheet */}
            <div id="barcode-modal-scroll-body" className="p-6 overflow-y-auto bg-slate-50 flex-grow">
              <div 
                id="printable-barcode-sheet" 
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {db.stockMaster
                  .filter(item => {
                    const matchesSearch = searchQuery === '' || 
                      (item.article_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.barcode || '').includes(searchQuery);
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
                          <QRCodeSVG 
                            value={JSON.stringify({
                              article_number: item.article_number, 
                              description: item.description,
                              location: item.location || 'UNALLOCATED'
                            })} 
                            size={84}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#000000"
                            className="border border-slate-200 p-1 bg-white shrink-0"
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
                  value={isNaN(receiveQty) ? '' : receiveQty}
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
                value={isNaN(quickOrderQty) ? '' : quickOrderQty}
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

      <ManualPOModal
        isOpen={isManualPOModalOpen}
        onClose={() => setIsManualPOModalOpen(false)}
        stockMaster={db.stockMaster}
        filteredArticles={filteredArticles}
        manualPOForm={manualPOForm}
        setManualPOForm={setManualPOForm}
        quantityError={quantityError}
        setQuantityError={setQuantityError}
        handleCreateManualPO={handleCreateManualPO}
      />

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
                    <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center border border-slate-300 shrink-0">
                      <Package className="w-7 h-7 text-slate-500" />
                    </div>
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
                          This purchase order has been fully received. The corresponding quantity of <strong className="text-slate-800">{(selectedPOWorkflow.order_quantity_units ?? 0).toLocaleString()} units</strong> has been added to the master shelf location for <strong className="text-slate-800">{article?.description}</strong>.
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

      {/* LOGIN MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">
                  Sign In to DELSM
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setLoginError('');
                  setLoginUsername('');
                  setLoginPassword('');
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                &times;
              </button>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold leading-normal flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div>{loginError}</div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setLoginError('');
                    setLoginUsername('');
                    setLoginPassword('');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg transition shadow-sm hover:shadow"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projected Date Confirmation Modal */}
      {isProjDateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Confirm Date Shift & Clear Values</h3>
                <p className="text-[11px] text-slate-500">Action will clear inventory state metrics</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              Modifying the projected date to <strong className="font-semibold text-slate-900">{pendingProjDate}</strong> will permanently delete all values in <strong className="font-semibold text-slate-900">Quantity Details</strong> and <strong className="font-semibold text-slate-900">Current Stock</strong> fields for all items in the database.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsProjDateModalOpen(false);
                  setPendingProjDate('');
                }}
                className="px-4 py-2 rounded-lg text-slate-600 font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmProjectedDate}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-lg shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Workspace Modal */}
      <GoogleWorkspaceModal
        isOpen={isGoogleWorkspaceModalOpen}
        onClose={() => setIsGoogleWorkspaceModalOpen(false)}
        dbData={db}
        onUpdateStockMaster={(updatedMaster) => {
          setDb(prev => ({ ...prev, stockMaster: updatedMaster }));
          updatedMaster.forEach(item => {
            saveStockMasterToFirestore(item).catch(err => console.error(err));
          });
        }}
      />

    </div>
  );
}
