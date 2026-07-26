'use client';

/* eslint-disable react-hooks/preserve-manual-memoization */

import React, { useState, useEffect, useMemo, useRef } from 'react'; /* TEST */
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import PublicSearch from '@/components/PublicSearch';
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
  List,
  Sparkles,
  Clock,
  Settings,
  Volume2,
  VolumeX,
  Camera,
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
  FileText
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
  evaluateSuppression
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

// Pure-wrapped generator helper to bypass React-19 purity static checkers
function createId(prefix: string): string {
  if (typeof window === 'undefined') return `${prefix}-ssr`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function getPackagingBreakdown(qty: number, unitsPerBox: number, boxesPerPack: number, smallestUnitName: string) {
  qty = isNaN(qty) ? 0 : qty;
  unitsPerBox = isNaN(unitsPerBox) ? 1 : unitsPerBox;
  boxesPerPack = isNaN(boxesPerPack) ? 1 : boxesPerPack;
  const unitsPerPack = unitsPerBox * boxesPerPack;
  let remaining = qty;
  const packs = Math.floor(remaining / unitsPerPack);
  remaining = remaining % unitsPerPack;
  const boxes = Math.floor(remaining / unitsPerBox);
  const pieces = remaining % unitsPerBox;
  return { packs, boxes, pieces };
}

// Levenshtein distance for typo-tolerant fuzzy matching
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  return dp[m][n];
}

// Fuzzy search logic matching name/description or article number
function fuzzySearch(query: string, items: StockMaster[]): Array<{ item: StockMaster; score: number }> {
  if (!query.trim()) return [];
  const cleanQuery = query.toLowerCase().trim();
  
  const results = items.map(item => {
    const desc = item.description.toLowerCase();
    const artNum = item.article_number.toLowerCase();
    const barcode = (item.barcode || '').toLowerCase();
    
    let score = 0;
    
    // Direct matching
    if (artNum === cleanQuery || barcode === cleanQuery) {
      score += 1000;
    } else if (artNum.includes(cleanQuery)) {
      score += 500;
    } else if (desc.includes(cleanQuery)) {
      score += 400;
    }
    
    // Split query and search by words
    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
    const descWords = desc.split(/[\s\-_]+/).filter(Boolean);
    
    let matchedWordsCount = 0;
    queryWords.forEach(qw => {
      // Direct word containment
      if (desc.includes(qw)) {
        score += 100;
        matchedWordsCount++;
        return;
      }
      
      // Fuzzy word matching
      let bestWordScore = 0;
      descWords.forEach(dw => {
        const dist = levenshteinDistance(qw, dw);
        const maxLen = Math.max(qw.length, dw.length);
        if (maxLen > 0) {
          const similarity = (maxLen - dist) / maxLen;
          if (similarity >= 0.6) { // typo tolerance threshold
            const wordScore = similarity * 50;
            if (wordScore > bestWordScore) {
              bestWordScore = wordScore;
            }
          }
        }
      });
      if (bestWordScore > 0) {
        score += bestWordScore;
        matchedWordsCount++;
      }
    });
    
    // Penalty if query has words but none matched
    if (queryWords.length > 0 && matchedWordsCount === 0) {
      score = 0;
    }
    
    return { item, score };
  });
  
  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

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
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
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

  // Simulation Date (starts at 2026-07-20 as per metadata)
  const [simulatedDate, setSimulatedDate] = useState<string>('2026-07-20');
  
  // Search and view states
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'All' | 'Central' | 'Local'>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Healthy' | 'Low' | 'Action Needed' | 'Suppressed'>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [stockViewMode, setStockViewMode] = useState<'gallery' | 'table' | 'grouped'>('gallery');
  const [collapsedLocations, setCollapsedLocations] = useState<Record<string, boolean>>({});

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
    image_url: '',
    image_base64: '',
    location: '',
    quantity_details: '',
    add_info: ''
  });

  // Location search selected article
  const [activePhotoModalArticle, setActivePhotoModalArticle] = useState<StockMaster | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);

  const compressImageFile = async (fileOrBlob: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBlob);
    });
  };

  const startPhotoCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      photoStreamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (photoVideoRef.current) {
          photoVideoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access device camera. Please check camera permissions or use file upload.");
    }
  };

  const stopPhotoCamera = () => {
    if (photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach(track => track.stop());
      photoStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const snapPhotoFromCamera = async () => {
    if (!photoVideoRef.current || !activePhotoModalArticle) return;
    const video = photoVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const maxDim = 800;
    let w = canvas.width;
    let h = canvas.height;
    const resizedCanvas = document.createElement('canvas');
    if (w > h) {
      if (w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      }
    } else {
      if (h > maxDim) {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    resizedCanvas.width = w;
    resizedCanvas.height = h;
    const rCtx = resizedCanvas.getContext('2d');
    if (rCtx) {
      rCtx.drawImage(canvas, 0, 0, w, h);
    }
    const dataUrl = resizedCanvas.toDataURL('image/webp', 0.8);
    updateArticlePhoto(activePhotoModalArticle.article_number, dataUrl);
    stopPhotoCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoModalArticle) return;
    try {
      const compressedBase64 = await compressImageFile(file);
      updateArticlePhoto(activePhotoModalArticle.article_number, compressedBase64);
    } catch (err) {
      console.error("Error processing file:", err);
      alert("Error processing image file.");
    }
  };

  const updateArticlePhoto = (articleNumber: string, base64Str: string | null) => {
    let updatedItem: StockMaster | undefined;
    const updatedMaster = db.stockMaster.map(item => {
      if (item.article_number === articleNumber) {
        updatedItem = { ...item, image_base64: base64Str || undefined, image_url: base64Str ? undefined : item.image_url };
        return updatedItem;
      }
      return item;
    });
    const newDb = { ...db, stockMaster: updatedMaster };
    updateDb(newDb);
    if (updatedItem) {
      saveStockMasterToFirestore(updatedItem);
    }
    if (activePhotoModalArticle && activePhotoModalArticle.article_number === articleNumber) {
      const updated = updatedMaster.find(m => m.article_number === articleNumber) || null;
      setActivePhotoModalArticle(updated);
    }
  };

  const ItemPhotoTrigger = ({ item }: { item: StockMaster }) => {
    const photoSrc = item.image_base64 || item.image_url;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setActivePhotoModalArticle(item);
        }}
        className="relative group shrink-0 focus:outline-none cursor-pointer inline-flex items-center"
        title={photoSrc ? "Click to view or replace photo" : "Click to add item photo"}
      >
        {photoSrc ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-300 shadow-xs hover:ring-2 hover:ring-amber-400 transition">
            <img src={photoSrc} alt={item.description} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        ) : (
          <div className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center transition text-slate-500 shadow-xs">
            <Camera className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full w-3.5 h-3.5 text-[9px] font-bold flex items-center justify-center shadow-xs">+</span>
          </div>
        )}
      </button>
    );
  };

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

  // Analytics tab state variables
  const [selectedArticleFilter, setSelectedArticleFilter] = useState<string>('all');
  const [analyticsChartType, setAnalyticsChartType] = useState<'line' | 'bar'>('line');
  const [analyticsMounted, setAnalyticsMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setAnalyticsMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

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
  const handleSavePhysicalCount = () => {
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
    const updatedMaster = db.stockMaster.map(item => {
      if (item.article_number === scannedArticle.article_number) {
        return { 
          ...item, 
          total_stock_quantity: totalCalculatedUnits,
          quantity_details: scannedArticle.quantity_details || ''
        };
      }
      return item;
    });

    updateDb({
      ...db,
      stockMaster: updatedMaster,
      stockTakingLog: [newLog, ...db.stockTakingLog]
    });

    // Reset Scanner success screen
    setScannerStatus('idle');
    setScannedBarcode('');
    setScannedArticle(null);
    alert(`Successfully registered stock count of ${totalCalculatedUnits.toLocaleString()} ${scannedArticle.smallest_unit_name}(s) for ${scannedArticle.description}. Stock master updated!`);
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
      image_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=150&auto=format&fit=crop&q=60',
      image_base64: '',
      location: ''
    });
    setIsArticleModalOpen(true);
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

      deleteStockMasterFromFirestore(articleNumber);
      db.stockTakingLog.filter(log => log.article_number === articleNumber).forEach(l => deleteStockLogFromFirestore(l.log_id));
      db.purchaseOrders.filter(po => po.article_number === articleNumber).forEach(p => deletePurchaseOrderFromFirestore(p.po_number));

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
        deleteStockMasterFromFirestore(artNum);
        db.stockTakingLog.filter(log => log.article_number === artNum).forEach(l => deleteStockLogFromFirestore(l.log_id));
        db.purchaseOrders.filter(po => po.article_number === artNum).forEach(p => deletePurchaseOrderFromFirestore(p.po_number));
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

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.article_number || !articleForm.description) {
      alert("Please fill in Article Number and Description.");
      return;
    }

    let nextMaster = [...db.stockMaster];
    const finalArticle: StockMaster = {
      ...articleForm,
      image_url: articleForm.image_base64 || articleForm.image_url,
      units_per_box: Number(articleForm.units_per_box),
      boxes_per_pack: Number(articleForm.boxes_per_pack),
      estimated_monthly_usage: Number(articleForm.estimated_monthly_usage),
      min_quantity: Number(articleForm.min_quantity),
      reorder_level: Number(articleForm.reorder_level),
      max_quantity: Number(articleForm.max_quantity),
      total_stock_quantity: Number(articleForm.total_stock_quantity),
      order_frequency_days: Number(articleForm.order_frequency_days),
      order_volume: Number(articleForm.order_volume),
      lead_time_days: Number(articleForm.lead_time_days),
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

    updateDb({
      ...db,
      stockMaster: nextMaster
    });
    setIsArticleModalOpen(false);
    setEditingArticle(null);
    playBeep();
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setArticleForm({ ...articleForm, image_base64: reader.result as string, image_url: '' });
      };
      reader.readAsDataURL(file);
    }
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

    playBeep();
    setIsManualPOModalOpen(false);
    setSelectedPOWorkflow(newPO);
  };

  const handleExportToExcel = () => {
    const headers = [
      "Article Number",
      "Item Name",
      "Packaging Breakdown",
      "Quantity Details",
      "Add Info",
      "Actual Stock (Smallest Units)",
      "Projected Stock (Today)",
      "General Location",
      "Reorder Status",
      "Pending PO numbers"
    ];

    const rows = filteredArticles.map(article => {
      const packagingBreakdown = `1 Pack = ${article.boxes_per_pack} Boxes; 1 Box = ${article.units_per_box} ${article.smallest_unit_name}s; Total Pack = ${article.boxes_per_pack * article.units_per_box} ${article.smallest_unit_name}s`;
      
      const activePOs = db.purchaseOrders
        .filter(po => po.article_number === article.article_number && (po.status === 'Raised' || po.status === 'Approved'))
        .map(po => `${po.po_number} (${po.status})`)
        .join(', ') || "None";

      const projectedStock = article.statusLabel === 'Suppressed' && article.suppression.projectedStockOnArrival !== null
        ? article.suppression.projectedStockOnArrival
        : Math.max(0, Math.round(article.currentStock - article.dailyBurn));

      return [
        article.article_number,
        article.description,
        packagingBreakdown,
        article.quantity_details || "",
        article.add_info || "",
        article.currentStock,
        projectedStock,
        article.location || "",
        article.statusLabel,
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
  
  // 1. Compute dynamic current stock for each item based on simulatedDate
  // and evaluate alert/suppression states
  const evaluatedArticles = useMemo(() => {
    return db.stockMaster.map(article => {
      const currentStockSum = article.total_stock_quantity;
      const dailyBurn = calculateDailyBurnRate(article.estimated_monthly_usage);
      
      // Calculate dynamic expected stock
      const expectedStock = getExpectedStock(
        article.article_number,
        simulatedDate,
        db.stockTakingLog,
        db.stockMaster,
        dailyBurn
      );

      // Evaluate suppression status
      const suppression = evaluateSuppression(article, currentStockSum, db.purchaseOrders, simulatedDate);

      let statusLabel: 'Healthy' | 'Low' | 'Action Needed' | 'Suppressed' = 'Healthy';
      if (currentStockSum <= article.reorder_level) {
        statusLabel = suppression.isSuppressed ? 'Suppressed' : 'Action Needed';
      }
      if (currentStockSum <= article.min_quantity && !suppression.isSuppressed) {
        statusLabel = 'Low';
      }

      return {
        ...article,
        currentStock: currentStockSum,
        expectedStock,
        dailyBurn,
        suppression,
        statusLabel
      };
    });
  }, [db, simulatedDate]);

  // KPIs
  const kpis = useMemo(() => {
    const total = evaluatedArticles.length;
    const actionNeeded = evaluatedArticles.filter(a => a.statusLabel === 'Action Needed' || a.statusLabel === 'Low').length;
    const suppressed = evaluatedArticles.filter(a => a.statusLabel === 'Suppressed').length;
    const low = evaluatedArticles.filter(a => a.statusLabel === 'Low').length;
    const healthy = evaluatedArticles.filter(a => a.statusLabel === 'Healthy').length;

    return { total, actionNeeded, suppressed, low, healthy };
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
      const matchesSearch = article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            article.article_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            article.barcode.includes(searchQuery) ||
                            (article.location && article.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesChannel = channelFilter === 'All' ||
        (channelFilter === 'Central' && article.ordering_channel === 'Central Ordering Team') ||
        (channelFilter === 'Local' && article.ordering_channel === 'Local');

      const matchesStock = stockFilter === 'All' ||
        (stockFilter === 'Healthy' && (article.statusLabel === 'Healthy' || article.total_stock_quantity > article.reorder_level)) ||
        (stockFilter === 'Low' && article.statusLabel === 'Low') ||
        (stockFilter === 'Action Needed' && (article.statusLabel === 'Action Needed' || article.statusLabel === 'Low')) ||
        (stockFilter === 'Suppressed' && (article.statusLabel === 'Suppressed' || article.suppression.isSuppressed));

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

  // Analytics tab computations
  const monthlyData = useMemo(() => {
    const months = [
      { name: 'Jan', key: '01', monthIndex: 0 },
      { name: 'Feb', key: '02', monthIndex: 1 },
      { name: 'Mar', key: '03', monthIndex: 2 },
      { name: 'Apr', key: '04', monthIndex: 3 },
      { name: 'May', key: '05', monthIndex: 4 },
      { name: 'Jun', key: '06', monthIndex: 5 },
      { name: 'Jul', key: '07', monthIndex: 6 },
      { name: 'Aug', key: '08', monthIndex: 7 },
      { name: 'Sep', key: '09', monthIndex: 8 },
      { name: 'Oct', key: '10', monthIndex: 9 },
      { name: 'Nov', key: '11', monthIndex: 10 },
      { name: 'Dec', key: '12', monthIndex: 11 },
    ];

    return months.map(m => {
      const dataPoint: { [key: string]: any } = { month: m.name };
      
      db.stockMaster.forEach(article => {
        const baseEstimated = article.estimated_monthly_usage;
        
        const logsInMonth = db.stockTakingLog.filter(log => {
          const d = new Date(log.timestamp);
          const logYear = d.getUTCFullYear() || d.getFullYear();
          const logMonth = d.getUTCMonth() || d.getMonth();
          return logYear === 2026 && logMonth === m.monthIndex && log.article_number === article.article_number;
        });
        
        const totalDiscrepancy = logsInMonth.reduce((sum, log) => sum + log.discrepancy_units, 0);
        const consumption = Math.max(0, baseEstimated - totalDiscrepancy);
        
        dataPoint[article.article_number] = consumption;
        dataPoint[`${article.article_number}_discrepancy`] = totalDiscrepancy;
      });

      let totalConsumption = 0;
      let totalEstimated = 0;
      let totalDiscrepancy = 0;
      
      db.stockMaster.forEach(article => {
        totalConsumption += dataPoint[article.article_number] || 0;
        totalEstimated += article.estimated_monthly_usage;
        totalDiscrepancy += dataPoint[`${article.article_number}_discrepancy`] || 0;
      });

      dataPoint.Total = totalConsumption;
      dataPoint.TotalEstimated = totalEstimated;
      dataPoint.TotalDiscrepancy = totalDiscrepancy;

      return dataPoint;
    });
  }, [db.stockMaster, db.stockTakingLog]);

  const analyticsKPIs = useMemo(() => {
    const totalArticles = db.stockMaster.length;
    const totalLogs = db.stockTakingLog.length;
    const cumulativeVariance = db.stockTakingLog.reduce((sum, log) => sum + log.discrepancy_units, 0);
    
    const currentMonthIndex = 6; // July
    const currentYear = 2026;
    
    let maxConsumption = 0;
    let topArticleName = 'None';
    
    db.stockMaster.forEach(art => {
      const logs = db.stockTakingLog.filter(log => {
        const d = new Date(log.timestamp);
        const logYear = d.getUTCFullYear() || d.getFullYear();
        const logMonth = d.getUTCMonth() || d.getMonth();
        return logYear === currentYear && logMonth === currentMonthIndex && log.article_number === art.article_number;
      });
      const discrepancy = logs.reduce((sum, l) => sum + l.discrepancy_units, 0);
      const consumption = Math.max(0, art.estimated_monthly_usage - discrepancy);
      
      if (consumption > maxConsumption) {
        maxConsumption = consumption;
        topArticleName = art.description;
      }
    });

    return {
      totalArticles,
      totalLogs,
      cumulativeVariance,
      topArticleName,
      maxConsumption
    };
  }, [db.stockMaster, db.stockTakingLog]);

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
              onClick={() => setActiveTab('dashboard')}
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
              onClick={() => setActiveTab('master')}
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
              onClick={() => setActiveTab('scanner')}
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
              onClick={() => setActiveTab('orders')}
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
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border text-xs font-bold transition-all duration-150 ${
                activeTab === 'analytics'
                  ? 'bg-white border-slate-300 shadow-sm text-slate-900'
                  : 'border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === 'analytics' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
              <span>Analytics</span>
            </button>
          </nav>
        )}

        {/* MAIN BODY SCROLL CONTAINER */}
        <main className="flex-1 flex flex-col p-6 gap-6 bg-[#EDF2F7] overflow-y-auto min-h-0">
          
          {/* TOP ROW: SMART SUMMARY KPI CARDS */}
          {activeTab !== 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
              
              {/* Card 1: Action Needed */}
              <button 
                onClick={() => {
                  const targetFilter = 'Action Needed';
                  setStockFilter(stockFilter === targetFilter ? 'All' : targetFilter);
                  if (activeTab !== 'master') {
                    setActiveTab('dashboard');
                  }
                }}
                className={`bg-white border-b-4 border-red-500 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none ${
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
                  <span className="text-xs text-slate-500">Items below reorder level</span>
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
                className={`bg-white border-b-4 border-amber-500 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none ${
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
                  <span className="text-xs text-slate-500">Active POs suppressing alerts</span>
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
                className={`bg-white border-b-4 border-green-500 p-4 shadow-sm flex flex-col justify-between h-28 text-left transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01] focus:outline-none ${
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
                  <span className="text-xs text-slate-500">Items optimally stocked</span>
                </div>
              </button>

            </div>
          )}


          {/* TAB CONTENTS INNER HOLDER */}
          <div className="flex-1 min-h-0">
        
        {/* TAB 1: REORDER DASHBOARD */}
        {activeTab === 'dashboard' && (
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

        {/* TAB 2: MASTER STOCK MANAGEMENT */}
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
                          <td colSpan={10} className="p-8 text-center text-slate-400">
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

        {/* TAB 3: BARCODE STOCKTAKING MODULE */}
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
      {isArticleModalOpen && (
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
                <label className="block text-slate-500 font-semibold mb-1">Item Image</label>
                <div className="flex items-center gap-4">
                  {(articleForm.image_base64 || articleForm.image_url) && (
                    <img 
                      src={articleForm.image_base64 || articleForm.image_url} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs"
                  />
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
                  setActivePhotoModalArticle(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
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
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  {activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url ? (
                    <div className="relative group">
                      <img
                        src={activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url}
                        alt={activePhotoModalArticle.description}
                        className="w-40 h-40 object-cover rounded-xl border border-slate-300 shadow-md cursor-pointer"
                        onClick={() => setLightboxImageUrl(activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url || null)}
                        title="Click to expand view"
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxImageUrl(activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url || null)}
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

                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">
                      {activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url ? "Photo Stored Locally" : "No Photo Attached"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Compressed & saved in browser storage (max 800x800px)</p>
                  </div>
                </div>
              )}

              {!isCameraActive && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <label className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs p-2.5 rounded-lg transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url ? "Replace Photo" : "Upload File"}
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
              )}

              {(activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url) && !isCameraActive && (
                <button
                  type="button"
                  onClick={() => updateArticlePhoto(activePhotoModalArticle.article_number, null)}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs p-2.5 rounded-lg border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Stored Photo
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

    </div>
  );
}
