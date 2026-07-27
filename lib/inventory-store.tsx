'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
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
import { Camera } from 'lucide-react';

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

export type InventoryStore = ReturnType<typeof useInventoryStore>;

export function useInventoryStore() {
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
  const [stagedPhotoBase64, setStagedPhotoBase64] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState<boolean>(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);
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
    setStagedPhotoBase64(dataUrl);
    setPhotoSuccessMsg("Photo snapped! Click 'Save to Firebase Database' below to persist.");
    stopPhotoCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoModalArticle) return;
    try {
      const compressedBase64 = await compressImageFile(file);
      setStagedPhotoBase64(compressedBase64);
      setPhotoSuccessMsg("Photo uploaded! Click 'Save to Firebase Database' below to persist.");
    } catch (err) {
      console.error("Error processing file:", err);
      alert("Error processing image file.");
    }
  };

  const handleSavePhotoToFirebase = async () => {
    if (!activePhotoModalArticle) return;
    const photoToSave = stagedPhotoBase64 || activePhotoModalArticle.image_base64 || activePhotoModalArticle.image_url;
    if (!photoToSave) {
      alert("No photo available to save.");
      return;
    }

    setIsSavingPhoto(true);
    setPhotoSuccessMsg(null);
    try {
      let savedServerUrl = photoToSave;
      if (photoToSave.startsWith('data:image')) {
        const uploadRes = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_number: activePhotoModalArticle.article_number,
            image_base64: photoToSave
          })
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.image_url) {
          savedServerUrl = uploadData.image_url;
        }
      }

      let updatedItem: StockMaster | undefined;
      const updatedMaster = db.stockMaster.map(item => {
        if (item.article_number === activePhotoModalArticle.article_number) {
          updatedItem = { 
            ...item, 
            image_url: savedServerUrl, 
            image_base64: savedServerUrl.startsWith('data:') ? savedServerUrl : undefined
          };
          return updatedItem;
        }
        return item;
      });

      const newDb = { ...db, stockMaster: updatedMaster };
      updateDb(newDb);

      if (updatedItem) {
        await saveStockMasterToFirestore(updatedItem);
        setStagedPhotoBase64(null);
        setActivePhotoModalArticle(updatedItem);
        setPhotoSuccessMsg("Photo saved to App Files & Firebase Database!");
        setTimeout(() => setPhotoSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      console.error("Failed to save image to Server/Firebase:", err);
      alert("Failed to save image to server or Firebase database.");
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleDeletePhotoFromFirebase = async () => {
    if (!activePhotoModalArticle) return;
    if (!confirm("Are you sure you want to delete this photo from App Files & Firebase Database?")) return;

    setIsSavingPhoto(true);
    setPhotoSuccessMsg(null);
    try {
      await fetch(`/api/upload-image?article_number=${encodeURIComponent(activePhotoModalArticle.article_number)}`, {
        method: 'DELETE'
      });

      let updatedItem: StockMaster | undefined;
      const updatedMaster = db.stockMaster.map(item => {
        if (item.article_number === activePhotoModalArticle.article_number) {
          updatedItem = { 
            ...item, 
            image_base64: undefined, 
            image_url: undefined 
          };
          return updatedItem;
        }
        return item;
      });

      const newDb = { ...db, stockMaster: updatedMaster };
      updateDb(newDb);

      if (updatedItem) {
        await saveStockMasterToFirestore(updatedItem);
        setStagedPhotoBase64(null);
        setActivePhotoModalArticle(updatedItem);
        setPhotoSuccessMsg("Photo deleted from App Files & Firebase Database.");
        setTimeout(() => setPhotoSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      console.error("Failed to delete photo from App Files/Firebase:", err);
      alert("Error deleting photo from server/database.");
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const updateArticlePhoto = (articleNumber: string, base64Str: string | null) => {
    let updatedItem: StockMaster | undefined;
    const updatedMaster = db.stockMaster.map(item => {
      if (item.article_number === articleNumber) {
        updatedItem = { ...item, image_base64: base64Str || '', image_url: base64Str || '' };
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

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.article_number || !articleForm.description) {
      alert("Please fill in Article Number and Description.");
      return;
    }

    let savedImageUrl = articleForm.image_url;
    if (articleForm.image_base64 && articleForm.image_base64.startsWith('data:image')) {
      try {
        const uploadRes = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_number: articleForm.article_number,
            image_base64: articleForm.image_base64
          })
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.image_url) {
          savedImageUrl = uploadData.image_url;
        }
      } catch (err) {
        console.error("Error saving image to app files server:", err);
      }
    }

    let nextMaster = [...db.stockMaster];
    const finalArticle: StockMaster = {
      ...articleForm,
      image_url: savedImageUrl,
      image_base64: savedImageUrl?.startsWith('data:') ? savedImageUrl : undefined,
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
    await saveStockMasterToFirestore(finalArticle);
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

  return {
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
    deletePurchaseOrderFromFirestore,
  };
}
