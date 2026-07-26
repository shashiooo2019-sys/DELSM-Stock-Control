import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db as firestoreDb } from './firebase';

// Internal ID helper
function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

export type OrderingChannel = 'Central Ordering Team' | 'Local';
export type StockTakingInputType = 'Pack' | 'Box' | 'Smallest Unit';
export type DiscrepancyStatus = 'Matched' | 'Surplus' | 'Deficit';
export type POStatus = 'Raised' | 'Approved' | 'Received' | 'Rejected' | 'Pending' | 'Submitted';

export interface StockMaster {
  article_number: string;
  description: string;
  barcode: string;
  smallest_unit_name: string;
  units_per_box: number;
  boxes_per_pack: number;
  estimated_monthly_usage: number; // in smallest units
  min_quantity: number; // in smallest units
  reorder_level: number; // in smallest units
  max_quantity: number; // in smallest units
  total_stock_quantity: number; // in smallest units
  order_frequency_days: number;
  order_volume: number; // in smallest units
  ordering_channel: OrderingChannel;
  lead_time_days: number;
  image_url?: string;
  image_base64?: string;
  location?: string;
  quantity_details?: string;
  add_info?: string;
}

export interface StockTakingLog {
  log_id: string;
  article_number: string;
  timestamp: string; // ISO string
  input_type: StockTakingInputType;
  input_count: number;
  actual_quantity_units: number;
  expected_quantity_units: number;
  discrepancy_units: number;
  discrepancy_status: DiscrepancyStatus;
}

export interface PurchaseOrder {
  po_number: string;
  article_number: string;
  order_date: string; // YYYY-MM-DD
  approval_date?: string; // YYYY-MM-DD (Nullable)
  expected_delivery_date: string; // YYYY-MM-DD
  order_quantity_units: number;
  status: POStatus;
}

// Initial Mock Data
const INITIAL_STOCK_MASTER: StockMaster[] = [
  {
    article_number: "DS-1001",
    description: "Premium Fountain Pen (Royal Blue)",
    barcode: "8901034001012",
    smallest_unit_name: "Piece",
    units_per_box: 10,
    boxes_per_pack: 5,
    estimated_monthly_usage: 1500,
    min_quantity: 200,
    reorder_level: 400,
    max_quantity: 2000,
    total_stock_quantity: 450,
    order_frequency_days: 30,
    order_volume: 1000,
    ordering_channel: "Central Ordering Team",
    lead_time_days: 14,
    image_url: "https://images.unsplash.com/photo-1583485088034-09772569c262?w=150&auto=format&fit=crop&q=60"
  },
  {
    article_number: "DS-1002",
    description: "Cotton Cards Elegant Ivory (A6)",
    barcode: "8901034001029",
    smallest_unit_name: "Card",
    units_per_box: 100,
    boxes_per_pack: 10,
    estimated_monthly_usage: 3000,
    min_quantity: 500,
    reorder_level: 1200,
    max_quantity: 5000,
    total_stock_quantity: 800,
    order_frequency_days: 45,
    order_volume: 3000,
    ordering_channel: "Central Ordering Team",
    lead_time_days: 20,
    image_url: "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=150&auto=format&fit=crop&q=60"
  },
  {
    article_number: "DS-1003",
    description: "Matte Black Kraft Gift Bags",
    barcode: "8901034001036",
    smallest_unit_name: "Bag",
    units_per_box: 50,
    boxes_per_pack: 8,
    estimated_monthly_usage: 1200,
    min_quantity: 150,
    reorder_level: 300,
    max_quantity: 1500,
    total_stock_quantity: 280,
    order_frequency_days: 15,
    order_volume: 800,
    ordering_channel: "Local",
    lead_time_days: 3,
    image_url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&auto=format&fit=crop&q=60"
  },
  {
    article_number: "DS-1004",
    description: "Metallic Wax Seal Stamps",
    barcode: "8901034001043",
    smallest_unit_name: "Seal",
    units_per_box: 200,
    boxes_per_pack: 15,
    estimated_monthly_usage: 9000,
    min_quantity: 1000,
    reorder_level: 2500,
    max_quantity: 12000,
    total_stock_quantity: 3500,
    order_frequency_days: 20,
    order_volume: 6000,
    ordering_channel: "Local",
    lead_time_days: 4,
    image_url: "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=150&auto=format&fit=crop&q=60"
  },
  {
    article_number: "DS-1005",
    description: "Handmade Calligraphy Parchment (A4)",
    barcode: "8901034001050",
    smallest_unit_name: "Sheet",
    units_per_box: 250,
    boxes_per_pack: 4,
    estimated_monthly_usage: 6000,
    min_quantity: 800,
    reorder_level: 1500,
    max_quantity: 8000,
    total_stock_quantity: 1200,
    order_frequency_days: 25,
    order_volume: 4000,
    ordering_channel: "Central Ordering Team",
    lead_time_days: 18,
    image_url: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=150&auto=format&fit=crop&q=60"
  },
];

const INITIAL_STOCK_TAKING_LOG: StockTakingLog[] = [
  {
    log_id: "LOG-1",
    article_number: "DS-1001",
    timestamp: "2026-07-15T08:00:00Z",
    input_type: "Smallest Unit",
    input_count: 500,
    actual_quantity_units: 500,
    expected_quantity_units: 520,
    discrepancy_units: -20,
    discrepancy_status: "Deficit",
  },
  {
    log_id: "LOG-2",
    article_number: "DS-1002",
    timestamp: "2026-07-10T09:00:00Z",
    input_type: "Pack",
    input_count: 1, // 1 pack = 1000 cards
    actual_quantity_units: 1000,
    expected_quantity_units: 1000,
    discrepancy_units: 0,
    discrepancy_status: "Matched",
  },
];

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    po_number: "PO-2026-001",
    article_number: "DS-1002",
    order_date: "2026-07-10",
    approval_date: "2026-07-10",
    expected_delivery_date: "2026-07-30", // 2026-07-10 + 20 days lead time
    order_quantity_units: 3000,
    status: "Approved",
  },
  {
    po_number: "PO-2026-002",
    article_number: "DS-1005",
    order_date: "2026-07-18",
    expected_delivery_date: "2026-08-05", // 2026-07-18 + 18 days lead time
    order_quantity_units: 4000,
    status: "Raised",
  },
];

// Helper Functions
export function calculateDailyBurnRate(estimatedMonthlyUsage: number): number {
  if (!estimatedMonthlyUsage || isNaN(estimatedMonthlyUsage) || estimatedMonthlyUsage < 0) return 0;
  const rate = estimatedMonthlyUsage / 30;
  return isNaN(rate) ? 0 : rate;
}

export function convertToSmallestUnits(
  packs: number,
  boxes: number,
  smallestUnits: number,
  unitsPerBox: number,
  boxesPerPack: number
): number {
  const p = isNaN(packs) ? 0 : packs;
  const b = isNaN(boxes) ? 0 : boxes;
  const u = isNaN(smallestUnits) ? 0 : smallestUnits;
  const upb = isNaN(unitsPerBox) || unitsPerBox <= 0 ? 1 : unitsPerBox;
  const bpp = isNaN(boxesPerPack) || boxesPerPack <= 0 ? 1 : boxesPerPack;
  const result = (p * bpp * upb) + (b * upb) + u;
  return isNaN(result) ? 0 : result;
}

export function getExpectedStock(
  articleNumber: string,
  targetDateStr: string,
  logs: StockTakingLog[],
  stockMaster: StockMaster[],
  burnRate: number
): number {
  const targetTime = new Date(targetDateStr).getTime();
  const safeBurn = isNaN(burnRate) ? 0 : burnRate;
  
  // Find logs for this article sorted by timestamp descending
  const articleLogs = logs
    .filter(log => log.article_number === articleNumber)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let lastCountTime: number;
  let lastCountQuantity: number;

  if (articleLogs.length > 0) {
    const mostRecentLog = articleLogs[0];
    lastCountTime = new Date(mostRecentLog.timestamp).getTime();
    lastCountQuantity = isNaN(mostRecentLog.actual_quantity_units) ? 0 : mostRecentLog.actual_quantity_units;
  } else {
    // If no physical count logs exist, use current stock quantity from master list as the initial count starting on 2026-07-01
    lastCountTime = new Date("2026-07-01T00:00:00Z").getTime();
    const article = stockMaster.find(sm => sm.article_number === articleNumber);
    lastCountQuantity = article && !isNaN(article.total_stock_quantity) ? article.total_stock_quantity : 0;
  }

  const validTarget = isNaN(targetTime) ? Date.now() : targetTime;
  const validLast = isNaN(lastCountTime) ? validTarget : lastCountTime;
  const msElapsed = validTarget - validLast;
  const daysElapsed = Math.max(0, isNaN(msElapsed) ? 0 : msElapsed / (1000 * 60 * 60 * 24));
  
  const expectedStock = (lastCountQuantity ?? 0) - (daysElapsed * safeBurn);
  return Math.max(0, isNaN(expectedStock) ? 0 : Math.round(expectedStock));
}

export interface SuppressionResult {
  isSuppressed: boolean;
  activePO: PurchaseOrder | null;
  projectedStockOnArrival: number | null;
  alertTriggered: boolean;
  alertMessage: string;
  aheadOfSchedule: boolean;
}

export function evaluateSuppression(
  article: StockMaster,
  currentStock: number,
  allPOs: PurchaseOrder[],
  currentTimeStr: string
): SuppressionResult {
  const safeStock = isNaN(currentStock) ? 0 : currentStock;
  const reorderLvl = isNaN(article.reorder_level) ? 0 : article.reorder_level;
  const isBelowReorder = safeStock <= reorderLvl;
  
  // Find active POs (Approved, Raised, or Submitted that have not been delivered or rejected)
  const activePOs = allPOs
    .filter(po => po.article_number === article.article_number && (po.status === 'Approved' || po.status === 'Raised' || po.status === 'Submitted' || po.status === 'Pending'))
    .sort((a, b) => {
      const dateA = new Date(a.expected_delivery_date || a.order_date || currentTimeStr).getTime();
      const dateB = new Date(b.expected_delivery_date || b.order_date || currentTimeStr).getTime();
      return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
    });
  
  const activePO = activePOs.length > 0 ? activePOs[0] : null;

  if (isBelowReorder) {
    if (activePO) {
      // Suppress standard Reorder Alert
      const today = new Date(currentTimeStr);
      const deliveryDateStr = activePO.expected_delivery_date || activePO.order_date || currentTimeStr;
      const deliveryDate = new Date(deliveryDateStr.includes('T') ? deliveryDateStr : deliveryDateStr + 'T00:00:00');
      const timeToday = isNaN(today.getTime()) ? Date.now() : today.getTime();
      const timeDelivery = isNaN(deliveryDate.getTime()) ? timeToday : deliveryDate.getTime();
      const msDiff = timeDelivery - timeToday;
      const daysUntilDelivery = Math.max(0, isNaN(msDiff) ? 0 : Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
      const dailyBurn = calculateDailyBurnRate(article.estimated_monthly_usage);
      const rawProjected = safeStock - (daysUntilDelivery * dailyBurn);
      const projectedStockOnArrival = isNaN(rawProjected) ? 0 : Math.round(rawProjected);

      return {
        isSuppressed: true,
        activePO,
        projectedStockOnArrival,
        alertTriggered: false,
        alertMessage: "",
        aheadOfSchedule: false,
      };
    } else {
      // Find historical orders to check frequency
      const articlePOs = allPOs
        .filter(po => po.article_number === article.article_number)
        .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
      
      let aheadOfSchedule = false;
      if (articlePOs.length > 0) {
        const lastPO = articlePOs[0];
        const timeToday = new Date(currentTimeStr).getTime();
        const timeOrder = new Date(lastPO.order_date).getTime();
        if (!isNaN(timeToday) && !isNaN(timeOrder)) {
          const msDiff = timeToday - timeOrder;
          const daysSinceLastPO = msDiff / (1000 * 60 * 60 * 24);
          if (!isNaN(daysSinceLastPO) && daysSinceLastPO < (article.order_frequency_days ?? 0)) {
            aheadOfSchedule = true;
          }
        }
      }

      return {
        isSuppressed: false,
        activePO: null,
        projectedStockOnArrival: null,
        alertTriggered: true,
        alertMessage: "Item below reorder level. Action required!",
        aheadOfSchedule,
      };
    }
  }

  return {
    isSuppressed: false,
    activePO: activePO || null,
    projectedStockOnArrival: null,
    alertTriggered: false,
    alertMessage: "",
    aheadOfSchedule: false,
  };
}

export function loadDatabase() {
  if (typeof window === 'undefined') {
    return {
      stockMaster: INITIAL_STOCK_MASTER,
      stockTakingLog: INITIAL_STOCK_TAKING_LOG,
      purchaseOrders: INITIAL_PURCHASE_ORDERS,
    };
  }

  const stockMaster = localStorage.getItem('delhi_stock_master');
  const stockTakingLog = localStorage.getItem('delhi_stock_taking_log');
  const purchaseOrders = localStorage.getItem('delhi_purchase_orders');
  const isInitialized = localStorage.getItem('delhi_stock_initialized') === 'true';

  let parsedStockMaster: StockMaster[] = stockMaster ? JSON.parse(stockMaster) : (isInitialized ? [] : INITIAL_STOCK_MASTER);
  parsedStockMaster = parsedStockMaster.map(item => ({
    ...item,
    total_stock_quantity: item.total_stock_quantity ?? 0,
    min_quantity: item.min_quantity ?? 0,
    reorder_level: item.reorder_level ?? 0,
    max_quantity: item.max_quantity ?? 0,
    estimated_monthly_usage: item.estimated_monthly_usage ?? 0,
    quantity_details: item.quantity_details ?? '',
    add_info: item.add_info ?? '',
    ordering_channel: (item.ordering_channel as string) === 'Imported - Germany/Switzerland' ? 'Central Ordering Team' : item.ordering_channel
  }));

  const parsedLogs: StockTakingLog[] = stockTakingLog ? JSON.parse(stockTakingLog) : (isInitialized ? [] : INITIAL_STOCK_TAKING_LOG);
  const sanitizedLogs = parsedLogs.map(log => ({
    ...log,
    discrepancy_units: log.discrepancy_units ?? 0,
    actual_quantity_units: log.actual_quantity_units ?? 0,
    expected_quantity_units: log.expected_quantity_units ?? 0
  }));

  const parsedPOs: PurchaseOrder[] = purchaseOrders ? JSON.parse(purchaseOrders) : (isInitialized ? [] : INITIAL_PURCHASE_ORDERS);

  return {
    stockMaster: parsedStockMaster,
    stockTakingLog: sanitizedLogs,
    purchaseOrders: parsedPOs,
  };
}

export function saveDatabase(data: {
  stockMaster: StockMaster[];
  stockTakingLog: StockTakingLog[];
  purchaseOrders: PurchaseOrder[];
}) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('delhi_stock_master', JSON.stringify(data.stockMaster));
  localStorage.setItem('delhi_stock_taking_log', JSON.stringify(data.stockTakingLog));
  localStorage.setItem('delhi_purchase_orders', JSON.stringify(data.purchaseOrders));
}

// Firestore Realtime Synchronization and Persistent Operations

export async function saveStockMasterToFirestore(item: StockMaster) {
  try {
    const docRef = doc(firestoreDb, 'stockMaster', item.article_number);
    await setDoc(docRef, item, { merge: true });
  } catch (err) {
    console.error('Error saving StockMaster to Firestore:', err);
  }
}

export async function deleteStockMasterFromFirestore(articleNumber: string) {
  try {
    const docRef = doc(firestoreDb, 'stockMaster', articleNumber);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting StockMaster from Firestore:', err);
  }
}

export async function saveStockLogToFirestore(log: StockTakingLog) {
  try {
    const docRef = doc(firestoreDb, 'stockTakingLogs', log.log_id);
    await setDoc(docRef, log, { merge: true });
  } catch (err) {
    console.error('Error saving StockTakingLog to Firestore:', err);
  }
}

export async function deleteStockLogFromFirestore(logId: string) {
  try {
    const docRef = doc(firestoreDb, 'stockTakingLogs', logId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting StockTakingLog from Firestore:', err);
  }
}

export async function savePurchaseOrderToFirestore(po: PurchaseOrder) {
  try {
    const docRef = doc(firestoreDb, 'purchaseOrders', po.po_number);
    await setDoc(docRef, po, { merge: true });
  } catch (err) {
    console.error('Error saving PurchaseOrder to Firestore:', err);
  }
}

export async function deletePurchaseOrderFromFirestore(poNumber: string) {
  try {
    const docRef = doc(firestoreDb, 'purchaseOrders', poNumber);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting PurchaseOrder from Firestore:', err);
  }
}

export async function seedInitialFirestoreData() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('delhi_stock_initialized', 'true');
    }
    const batch = writeBatch(firestoreDb);
    batch.set(doc(firestoreDb, 'appMeta', 'init'), { initialized: true });
    INITIAL_STOCK_MASTER.forEach(item => {
      const ref = doc(firestoreDb, 'stockMaster', item.article_number);
      batch.set(ref, item);
    });
    INITIAL_STOCK_TAKING_LOG.forEach(log => {
      const ref = doc(firestoreDb, 'stockTakingLogs', log.log_id);
      batch.set(ref, log);
    });
    INITIAL_PURCHASE_ORDERS.forEach(po => {
      const ref = doc(firestoreDb, 'purchaseOrders', po.po_number);
      batch.set(ref, po);
    });
    await batch.commit();
    console.log('Successfully seeded initial data to Firestore');
  } catch (err) {
    console.error('Error seeding initial Firestore data:', err);
  }
}

export function subscribeToDatabase(
  onUpdate: (data: {
    stockMaster: StockMaster[];
    stockTakingLog: StockTakingLog[];
    purchaseOrders: PurchaseOrder[];
  }) => void
) {
  const initialLocal = loadDatabase();
  let currentStockMaster: StockMaster[] = initialLocal.stockMaster;
  let currentLogs: StockTakingLog[] = initialLocal.stockTakingLog;
  let currentPOs: PurchaseOrder[] = initialLocal.purchaseOrders;

  let stockMasterLoaded = false;
  let isFirestoreInitialized = typeof window !== 'undefined' && localStorage.getItem('delhi_stock_initialized') === 'true';

  const unsubMeta = onSnapshot(doc(firestoreDb, 'appMeta', 'init'), (docSnap) => {
    if (docSnap.exists()) {
      isFirestoreInitialized = true;
      if (typeof window !== 'undefined') localStorage.setItem('delhi_stock_initialized', 'true');
    }
  });

  const notify = () => {
    if (!stockMasterLoaded) return;
    saveDatabase({
      stockMaster: currentStockMaster,
      stockTakingLog: currentLogs,
      purchaseOrders: currentPOs
    });
    onUpdate({
      stockMaster: currentStockMaster,
      stockTakingLog: currentLogs,
      purchaseOrders: currentPOs
    });
  };

  const unsubStock = onSnapshot(collection(firestoreDb, 'stockMaster'), (snapshot) => {
    stockMasterLoaded = true;
    if (snapshot.empty) {
      if (!isFirestoreInitialized) {
        isFirestoreInitialized = true;
        if (typeof window !== 'undefined') localStorage.setItem('delhi_stock_initialized', 'true');
        seedInitialFirestoreData();
        return;
      }
      currentStockMaster = [];
    } else {
      isFirestoreInitialized = true;
      if (typeof window !== 'undefined') localStorage.setItem('delhi_stock_initialized', 'true');
      currentStockMaster = snapshot.docs.map(d => d.data() as StockMaster);
    }
    notify();
  }, (err) => console.error('Firestore stockMaster snapshot error:', err));

  const unsubLogs = onSnapshot(collection(firestoreDb, 'stockTakingLogs'), (snapshot) => {
    currentLogs = snapshot.docs.map(d => d.data() as StockTakingLog);
    if (stockMasterLoaded) {
      notify();
    }
  }, (err) => console.error('Firestore stockTakingLogs snapshot error:', err));

  const unsubPOs = onSnapshot(collection(firestoreDb, 'purchaseOrders'), (snapshot) => {
    currentPOs = snapshot.docs.map(d => d.data() as PurchaseOrder);
    if (stockMasterLoaded) {
      notify();
    }
  }, (err) => console.error('Firestore purchaseOrders snapshot error:', err));

  return () => {
    unsubMeta();
    unsubStock();
    unsubLogs();
    unsubPOs();
  };
}
