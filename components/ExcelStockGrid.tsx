'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  TableProperties,
  Save,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Truck,
  Zap,
  LogOut,
  ArrowLeft,
  X,
  Pin,
  MoveHorizontal,
  Columns,
  GripVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StockMaster } from '@/lib/db';

export interface ExcelStockGridProps {
  filteredArticles: StockMaster[];
  selectedArticleNumbers: string[];
  setSelectedArticleNumbers: (nums: string[]) => void;
  gridEdits: Record<string, Partial<StockMaster>>;
  setGridEdits: React.Dispatch<React.SetStateAction<Record<string, Partial<StockMaster>>>>;
  gridAutoSave: boolean;
  setGridAutoSave: (val: boolean) => void;
  gridSavedToast: string | null;
  setGridSavedToast: (msg: string | null) => void;
  gridSaveError: string | null;
  setGridSaveError: (msg: string | null) => void;
  isBatchSavingGrid: boolean;
  batchLocationInput: string;
  setBatchLocationInput: (val: string) => void;
  uniqueLocations: string[];
  handleGridCellChange: (articleNum: string, field: keyof StockMaster, value: any, autoSave?: boolean) => void;
  handleSaveGridRow: (article: StockMaster) => Promise<void>;
  handleSaveAllGridEdits: () => Promise<void>;
  handleDiscardGridRow: (articleNum: string) => void;
  handleDiscardAllGridEdits: () => void;
  handleBulkApplyLocation: (loc: string) => void;
  onExitGridMode?: () => void;
  viewOnly?: boolean;
  compact?: boolean;
}

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  checkbox: 44,
  article_number: 130,
  description: 260,
  location: 130,
  quantity_details: 200,
  min_order_qty: 160,
  currentStock: 145,
  daysStockLeft: 135,
  min_quantity: 95,
  reorder_level: 105,
  max_quantity: 95,
  estimated_monthly_usage: 115,
  barcode: 130,
  ordering_channel: 130,
  lead_time_days: 105,
  boxes_per_pack: 90,
  units_per_box: 90,
  smallest_unit_name: 105,
  add_info: 180,
  actions: 100,
};

const COMPACT_COLUMN_WIDTHS: Record<string, number> = {
  checkbox: 30,
  article_number: 80,
  description: 150,
  location: 80,
  quantity_details: 100,
  min_order_qty: 80,
  currentStock: 80,
  daysStockLeft: 70,
  min_quantity: 60,
  reorder_level: 60,
  max_quantity: 60,
  estimated_monthly_usage: 70,
  barcode: 80,
  ordering_channel: 80,
  lead_time_days: 60,
  boxes_per_pack: 50,
  units_per_box: 50,
  smallest_unit_name: 60,
  add_info: 100,
  actions: 60,
};

const getColumnWidth = (key: string, compact?: boolean) => {
  const widths = compact ? COMPACT_COLUMN_WIDTHS : DEFAULT_COLUMN_WIDTHS;
  return widths[key] || 100;
};

// Quantity Details is placed BEFORE currentStock, followed by Stock Days Left
const DEFAULT_COLUMN_ORDER: string[] = [
  'checkbox',
  'article_number',
  'description',
  'location',
  'quantity_details',
  'min_order_qty',
  'currentStock',
  'daysStockLeft',
  'min_quantity',
  'reorder_level',
  'max_quantity',
  'estimated_monthly_usage',
  'barcode',
  'ordering_channel',
  'lead_time_days',
  'boxes_per_pack',
  'units_per_box',
  'smallest_unit_name',
  'add_info',
  'actions',
];

const FROZEN_KEYS = ['checkbox', 'article_number', 'description'];

export function ExcelStockGrid({
  filteredArticles,
  selectedArticleNumbers,
  setSelectedArticleNumbers,
  gridEdits,
  setGridEdits,
  gridAutoSave,
  setGridAutoSave,
  gridSavedToast,
  setGridSavedToast,
  gridSaveError,
  setGridSaveError,
  isBatchSavingGrid,
  batchLocationInput,
  setBatchLocationInput,
  uniqueLocations,
  handleGridCellChange,
  handleSaveGridRow,
  handleSaveAllGridEdits,
  handleDiscardGridRow,
  handleDiscardAllGridEdits,
  handleBulkApplyLocation,
  onExitGridMode,
  viewOnly = false,
  compact = false
}: ExcelStockGridProps) {
  // Column Widths State with LocalStorage Persistence
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('excel_grid_col_widths');
        if (saved) {
          return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return compact ? COMPACT_COLUMN_WIDTHS : DEFAULT_COLUMN_WIDTHS;
  });

  // Column Order State with LocalStorage Persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('excel_grid_col_order');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Keep valid saved columns, append any missing default columns
            const valid = parsed.filter((col: string) => DEFAULT_COLUMN_ORDER.includes(col));
            DEFAULT_COLUMN_ORDER.forEach((col) => {
              if (!valid.includes(col)) valid.push(col);
            });
            return valid;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_COLUMN_ORDER;
  });

  // Freeze Pane for Item Description Toggle
  const [freezeDescription, setFreezeDescription] = useState<boolean>(true);
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  // Grid Scroll Ref & Touch Swiping Gesture State
  const gridContainerRef = React.useRef<HTMLDivElement>(null);
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const scrollStartLeft = React.useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'select' || targetTag === 'button') {
      return;
    }
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      if (gridContainerRef.current) {
        scrollStartLeft.current = gridContainerRef.current.scrollLeft;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current !== null && touchStartY.current !== null && gridContainerRef.current) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = touchStartX.current - currentX;
      const deltaY = touchStartY.current - currentY;

      // If horizontal gesture is dominant, scroll horizontally
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        gridContainerRef.current.scrollLeft = scrollStartLeft.current + deltaX;
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const scrollGridBy = (amount: number) => {
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Drag & Drop Column Reordering State
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Column Resizing Handler
  const handleResizeStart = (colKey: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = columnWidths[colKey] || getColumnWidth(colKey, compact);
    setResizingCol(colKey);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const deltaX = currentX - clientX;
      const newWidth = Math.max(40, startWidth + deltaX);
      setColumnWidths((prev) => {
        const updated = { ...prev, [colKey]: newWidth };
        try {
          localStorage.setItem('excel_grid_col_widths', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });
    };

    const handleEnd = () => {
      setResizingCol(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  };

  // Drag & Drop Column Handlers
  const handleDragStart = (e: React.DragEvent, colKey: string) => {
    if (resizingCol) {
      e.preventDefault();
      return;
    }
    setDraggedCol(colKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colKey);
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    if (draggedCol && draggedCol !== colKey && dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colKey: string) => {
    if (dragOverCol === colKey) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColKey: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedCol || draggedCol === targetColKey) return;

    setColumnOrder((prev) => {
      const newOrder = [...prev];
      const draggedIdx = newOrder.indexOf(draggedCol);
      const targetIdx = newOrder.indexOf(targetColKey);
      if (draggedIdx !== -1 && targetIdx !== -1) {
        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedCol);
        try {
          localStorage.setItem('excel_grid_col_order', JSON.stringify(newOrder));
        } catch (err) {}
      }
      return newOrder;
    });
    setDraggedCol(null);
  };

  const handleDragEnd = () => {
    setDraggedCol(null);
    setDragOverCol(null);
  };

  const handleResetLayout = () => {
    setColumnWidths(compact ? COMPACT_COLUMN_WIDTHS : DEFAULT_COLUMN_WIDTHS);
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    try {
      localStorage.removeItem('excel_grid_col_widths');
      localStorage.removeItem('excel_grid_col_order');
    } catch (err) {}
  };

  // Calculate sticky offsets for frozen columns
  const frozenLeftMap = useMemo(() => {
    if (!freezeDescription) return {};
    const map: Record<string, number> = {};
    let currentLeft = 0;
    columnOrder.forEach((colKey) => {
      if (FROZEN_KEYS.includes(colKey)) {
        map[colKey] = currentLeft;
        currentLeft += columnWidths[colKey] || getColumnWidth(colKey, compact);
      }
    });
    return map;
  }, [freezeDescription, columnOrder, columnWidths, compact]);

  // Find the rightmost frozen column key in current columnOrder
  const lastFrozenColKey = useMemo(() => {
    if (!freezeDescription) return null;
    let lastKey = null;
    columnOrder.forEach((colKey) => {
      if (FROZEN_KEYS.includes(colKey)) {
        lastKey = colKey;
      }
    });
    return lastKey;
  }, [freezeDescription, columnOrder]);

  const renderHeaderContent = (colKey: string) => {
    switch (colKey) {
      case 'checkbox':
        return (
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
        );
      case 'article_number':
        return <span className="truncate">Article #</span>;
      case 'description':
        return (
          <div className="flex items-center justify-between gap-1 pr-1 w-full">
            <span className="truncate">Description</span>
            {freezeDescription && <Pin className="w-3 h-3 text-indigo-600 rotate-45 shrink-0" title="Frozen Pane" />}
          </div>
        );
      case 'location':
        return <span className="truncate">Location</span>;
      case 'quantity_details':
        return <span className="truncate">Quantity Details</span>;
      case 'min_order_qty':
        return <span className="truncate">Min Order Qty</span>;
      case 'currentStock':
        return <span className="truncate">Current Stock</span>;
      case 'daysStockLeft':
        return <span className="truncate text-rose-600 font-extrabold">Est. Days Left</span>;
      case 'min_quantity':
        return <span className="truncate">Min Qty</span>;
      case 'reorder_level':
        return <span className="truncate">Reorder Level</span>;
      case 'max_quantity':
        return <span className="truncate">Max Qty</span>;
      case 'estimated_monthly_usage':
        return <span className="truncate">Monthly Usage</span>;
      case 'barcode':
        return <span className="truncate">Barcode</span>;
      case 'ordering_channel':
        return <span className="truncate">Route</span>;
      case 'lead_time_days':
        return <span className="truncate">Lead Days</span>;
      case 'boxes_per_pack':
        return <span className="truncate">Boxes/Pack</span>;
      case 'units_per_box':
        return <span className="truncate">Units/Box</span>;
      case 'smallest_unit_name':
        return <span className="truncate">Unit Name</span>;
      case 'add_info':
        return <span className="truncate">Remarks / Add Info</span>;
      case 'actions':
        return <span className="truncate">Actions</span>;
      default:
        return <span className="truncate">{colKey}</span>;
    }
  };

  const renderCellContent = (
    colKey: string,
    article: StockMaster,
    rowEdit: Partial<StockMaster>,
    isModified: boolean,
    statusBadge: { bg: string; text: string }
  ) => {
    const desc = rowEdit.description !== undefined ? rowEdit.description : article.description;
    const loc = rowEdit.location !== undefined ? rowEdit.location : article.location;
    const stock = rowEdit.currentStock !== undefined ? rowEdit.currentStock : (article.currentStock ?? article.total_stock_quantity ?? 0);
    const minQ = rowEdit.min_quantity !== undefined ? rowEdit.min_quantity : article.min_quantity;
    const reorder = rowEdit.reorder_level !== undefined ? rowEdit.reorder_level : article.reorder_level;
    const maxQ = rowEdit.max_quantity !== undefined ? rowEdit.max_quantity : article.max_quantity;
    const monthly = rowEdit.estimated_monthly_usage !== undefined ? rowEdit.estimated_monthly_usage : article.estimated_monthly_usage;
    const code = rowEdit.barcode !== undefined ? rowEdit.barcode : article.barcode;
    const route = rowEdit.ordering_channel !== undefined ? rowEdit.ordering_channel : article.ordering_channel;
    const lead = rowEdit.lead_time_days !== undefined ? rowEdit.lead_time_days : article.lead_time_days;
    const bpp = rowEdit.boxes_per_pack !== undefined ? rowEdit.boxes_per_pack : article.boxes_per_pack;
    const upb = rowEdit.units_per_box !== undefined ? rowEdit.units_per_box : article.units_per_box;
    const unitName = rowEdit.smallest_unit_name !== undefined ? rowEdit.smallest_unit_name : article.smallest_unit_name;
    const qtySpec = rowEdit.quantity_details !== undefined ? rowEdit.quantity_details : article.quantity_details;
    const minOrderQty = rowEdit.min_order_qty !== undefined ? rowEdit.min_order_qty : article.min_order_qty;
    const addInfo = rowEdit.add_info !== undefined ? rowEdit.add_info : article.add_info;

    if (viewOnly) {
      switch (colKey) {
        case 'checkbox':
          return (
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
              className="cursor-pointer"
            />
          );
        case 'article_number':
          return (
            <div className="flex items-center gap-1 overflow-hidden font-mono text-xs text-slate-500 px-2 py-1">
              <span className="truncate">{article.article_number}</span>
            </div>
          );
        case 'description':
          return (
            <div className="px-2 py-1 font-sans text-xs font-semibold text-slate-800 truncate" title={desc || ''}>
              {desc || <span className="text-slate-300 italic">N/A</span>}
            </div>
          );
        case 'location':
          return (
            <div className="px-2 py-1 font-mono text-xs font-bold text-indigo-900 uppercase truncate" title={loc || ''}>
              {loc || <span className="text-slate-300 italic">N/A</span>}
            </div>
          );
        case 'quantity_details':
          return (
            <div className="px-2 py-1 font-sans text-xs text-slate-700 truncate" title={qtySpec || ''}>
              {qtySpec || <span className="text-slate-300 italic">N/A</span>}
            </div>
          );
        case 'min_order_qty':
          return (
            <div className="px-2 py-1 font-sans text-xs text-slate-700 truncate" title={minOrderQty || ''}>
              {minOrderQty || <span className="text-slate-300 italic">N/A</span>}
            </div>
          );
        case 'currentStock':
          return (
            <div className="flex items-center gap-1 px-1.5 py-1">
              <span className="font-mono text-xs font-bold text-slate-900 text-right w-16">{stock ?? 0}</span>
              <span className={`text-[9px] font-bold border px-1 py-0.5 rounded whitespace-nowrap shrink-0 ${statusBadge.bg}`}>
                {statusBadge.text}
              </span>
            </div>
          );
        case 'daysStockLeft': {
          const dailyBurn = (monthly || 0) / 30;
          const daysCover = dailyBurn > 0 ? (stock || 0) / dailyBurn : 999;
          const isBelowLead = dailyBurn > 0 && daysCover <= (lead || 0);

          if (isBelowLead) {
            return (
              <div className="animate-pulse bg-red-100 text-red-700 font-black text-[12px] px-2 py-1 rounded shadow-inner flex items-center justify-between font-mono w-full">
                <span>🚨 {daysCover.toFixed(1)}d</span>
                <span className="text-[9px] uppercase font-bold">&le; {lead}d Lead</span>
              </div>
            );
          }
          return (
            <div className="font-mono text-xs font-bold text-slate-700 text-right px-1 w-full">
              {dailyBurn > 0 ? `${daysCover.toFixed(1)} Days` : '∞ No Usage'}
            </div>
          );
        }
        case 'min_quantity':
          return (
            <div className="w-full px-2 py-1 font-mono text-xs text-slate-700 text-right">
              {minQ ?? 0}
            </div>
          );
        case 'reorder_level':
          return (
            <div className="w-full px-2 py-1 font-mono text-xs font-bold text-red-600 text-right">
              {reorder ?? 0}
            </div>
          );
        case 'max_quantity':
          return (
            <div className="w-full px-2 py-1 font-mono text-xs text-slate-700 text-right">
              {maxQ ?? 0}
            </div>
          );
        case 'estimated_monthly_usage':
          return (
            <div className="w-full px-2 py-1 font-mono text-xs text-slate-700 text-right">
              {monthly ?? 0}
            </div>
          );
        case 'barcode':
          return (
            <div className="px-2 py-1 font-mono text-xs text-slate-600 truncate" title={code || ''}>
              {code || <span className="text-slate-300 italic">N/A</span>}
            </div>
          );
        case 'ordering_channel':
          return (
            <div className="px-2 py-1 text-[11px] font-bold text-slate-800">
              {route === 'Local' ? 'Local Purchase' : 'Central Team'}
            </div>
          );
        case 'lead_time_days': {
          const dailyBurn = (monthly || 0) / 30;
          const daysCover = dailyBurn > 0 ? (stock || 0) / dailyBurn : 999;
          const isBelowLead = dailyBurn > 0 && daysCover <= (lead || 0);

          return (
            <div className="flex items-center justify-between gap-1 px-2 py-1">
              <span className={`font-mono text-xs font-bold text-right w-full ${isBelowLead ? 'text-red-600 font-black' : 'text-slate-700'}`}>
                {lead ?? 0}
              </span>
              {isBelowLead && (
                <span className="animate-flash-red text-[8px] font-black px-1 rounded text-white shrink-0 uppercase">
                  RISK
                </span>
              )}
            </div>
          );
        }
        case 'boxes_per_pack':
          return (
            <div className="w-full px-2 py-1 font-mono text-xs text-slate-700 text-right">
              {bpp ?? 0}
            </div>
          );
        case 'units_per_box':
          return (
            <div className="w-full px-2 py-1 font-mono text-xs text-slate-700 text-right">
              {upb ?? 0}
            </div>
          );
        case 'smallest_unit_name':
          return (
            <div className="px-2 py-1 font-sans text-xs text-slate-700 truncate" title={unitName || ''}>
              {unitName || <span className="text-slate-300 italic">N/A</span>}
            </div>
          );
        case 'add_info':
          return (
            <div className="px-2 py-1 font-sans text-xs text-slate-700 truncate" title={addInfo || ''}>
              {addInfo || <span className="text-slate-300 italic">N/A</span>}
            </div>
          );
        case 'actions':
          return (
            <div className="flex justify-end items-center px-2 py-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider select-none bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">View Only</span>
            </div>
          );
        default:
          return null;
      }
    }

    switch (colKey) {
      case 'checkbox':
        return (
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
        );
      case 'article_number':
        return (
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="truncate">{article.article_number}</span>
            {isModified && <span className="text-[9px] bg-amber-500 text-slate-950 font-extrabold px-1 rounded shrink-0">MOD</span>}
          </div>
        );
      case 'description':
        return (
          <input
            type="text"
            value={desc || ''}
            onChange={(e) => handleGridCellChange(article.article_number, 'description', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs font-semibold text-slate-800 outline-none transition truncate"
          />
        );
      case 'location':
        return (
          <input
            type="text"
            list="grid-locations-list"
            value={loc || ''}
            onChange={(e) => handleGridCellChange(article.article_number, 'location', e.target.value.toUpperCase())}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-indigo-50/50 hover:bg-indigo-50 focus:bg-white border border-indigo-100 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 font-mono text-xs font-bold text-indigo-900 outline-none transition uppercase truncate"
            placeholder="LOCATION..."
          />
        );
      case 'quantity_details':
        return (
          <input
            type="text"
            value={qtySpec || ''}
            onChange={(e) => handleGridCellChange(article.article_number, 'quantity_details', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition truncate"
            placeholder="e.g. 5 boxes x 20 rolls..."
          />
        );
      case 'min_order_qty':
        return (
          <input
            type="text"
            value={minOrderQty || ''}
            onChange={(e) => handleGridCellChange(article.article_number, 'min_order_qty', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition truncate"
            placeholder="e.g. 50 boxes, 1 pack..."
          />
        );
      case 'currentStock':
        return (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={stock ?? 0}
              onChange={(e) => handleGridCellChange(article.article_number, 'currentStock', e.target.value)}
              onBlur={() => gridAutoSave && handleSaveGridRow(article)}
              className="w-16 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-1.5 py-1 font-mono text-xs font-bold text-slate-900 outline-none text-right transition"
            />
            <span className={`text-[9px] font-bold border px-1 py-0.5 rounded whitespace-nowrap shrink-0 ${statusBadge.bg}`}>
              {statusBadge.text}
            </span>
          </div>
        );
      case 'daysStockLeft': {
        const dailyBurn = (monthly || 0) / 30;
        const daysCover = dailyBurn > 0 ? (stock || 0) / dailyBurn : 999;
        const isBelowLead = dailyBurn > 0 && daysCover <= (lead || 0);

        if (isBelowLead) {
          return (
            <div className="animate-flash-red text-[10px] font-black px-2 py-0.5 rounded text-white shadow-xs flex items-center justify-between font-mono">
              <span>🚨 {daysCover.toFixed(1)}d</span>
              <span className="text-[9px] font-bold uppercase">&le; {lead}d Lead</span>
            </div>
          );
        }
        return (
          <div className="font-mono text-xs font-bold text-slate-700 text-right px-1">
            {dailyBurn > 0 ? `${daysCover.toFixed(1)} Days` : '∞ No Usage'}
          </div>
        );
      }
      case 'min_quantity':
        return (
          <input
            type="number"
            value={minQ ?? 0}
            onChange={(e) => handleGridCellChange(article.article_number, 'min_quantity', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
          />
        );
      case 'reorder_level':
        return (
          <input
            type="number"
            value={reorder ?? 0}
            onChange={(e) => handleGridCellChange(article.article_number, 'reorder_level', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 rounded px-2 py-1 font-mono text-xs font-bold text-red-600 outline-none text-right transition"
          />
        );
      case 'max_quantity':
        return (
          <input
            type="number"
            value={maxQ ?? 0}
            onChange={(e) => handleGridCellChange(article.article_number, 'max_quantity', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
          />
        );
      case 'estimated_monthly_usage':
        return (
          <input
            type="number"
            value={monthly ?? 0}
            onChange={(e) => handleGridCellChange(article.article_number, 'estimated_monthly_usage', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
          />
        );
      case 'barcode':
        return (
          <input
            type="text"
            value={code || ''}
            onChange={(e) => handleGridCellChange(article.article_number, 'barcode', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none transition truncate"
          />
        );
      case 'ordering_channel':
        return (
          <select
            value={route || 'Central'}
            onChange={(e) => {
              handleGridCellChange(article.article_number, 'ordering_channel', e.target.value, true);
            }}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-1 text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="Central">Central Team</option>
            <option value="Local">Local Purchase</option>
          </select>
        );
      case 'lead_time_days': {
        const dailyBurn = (monthly || 0) / 30;
        const daysCover = dailyBurn > 0 ? (stock || 0) / dailyBurn : 999;
        const isBelowLead = dailyBurn > 0 && daysCover <= (lead || 0);

        return (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={lead ?? 0}
              onChange={(e) => handleGridCellChange(article.article_number, 'lead_time_days', e.target.value)}
              onBlur={() => gridAutoSave && handleSaveGridRow(article)}
              className={`w-full bg-transparent hover:bg-white focus:bg-white border hover:border-slate-300 focus:border-emerald-500 rounded px-2 py-1 font-mono text-xs font-bold outline-none text-right transition ${
                isBelowLead ? 'border-red-500 text-red-600 font-black' : 'border-transparent text-slate-700'
              }`}
            />
            {isBelowLead && (
              <span className="animate-flash-red text-[8px] font-black px-1 rounded text-white shrink-0 uppercase">
                RISK
              </span>
            )}
          </div>
        );
      }
      case 'boxes_per_pack':
        return (
          <input
            type="number"
            value={bpp ?? 0}
            onChange={(e) => handleGridCellChange(article.article_number, 'boxes_per_pack', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
          />
        );
      case 'units_per_box':
        return (
          <input
            type="number"
            value={upb ?? 0}
            onChange={(e) => handleGridCellChange(article.article_number, 'units_per_box', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-mono text-xs text-slate-700 outline-none text-right transition"
          />
        );
      case 'smallest_unit_name':
        return (
          <input
            type="text"
            value={unitName || ''}
            onChange={(e) => handleGridCellChange(article.article_number, 'smallest_unit_name', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition truncate"
          />
        );
      case 'add_info':
        return (
          <input
            type="text"
            value={addInfo || ''}
            onChange={(e) => handleGridCellChange(article.article_number, 'add_info', e.target.value)}
            onBlur={() => gridAutoSave && handleSaveGridRow(article)}
            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-2 py-1 font-sans text-xs text-slate-700 outline-none transition truncate"
            placeholder="e.g. Recounted on Monday..."
          />
        );
      case 'actions':
        return (
          <div className="flex justify-end gap-1">
            {isModified ? (
              <>
                <button
                  onClick={() => handleSaveGridRow(article)}
                  className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition shadow-2xs cursor-pointer"
                  title="Save changes for this row"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDiscardGridRow(article.article_number)}
                  className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition cursor-pointer"
                  title="Discard changes for this row"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span className="text-[10px] text-slate-400 italic select-none">Saved</span>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col my-4">
      {/* Grid Header Toolbar */}
      <div className={`p-4 ${viewOnly ? 'bg-indigo-950 border-b border-indigo-900' : 'bg-slate-900 border-b border-slate-800'} text-white flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 ${viewOnly ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'} rounded-xl border`}>
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
              {viewOnly ? 'Excel Spreadsheet Viewer' : 'Excel Quick Grid Edit'}
              <span className={`${viewOnly ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-slate-950'} font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase`}>
                {viewOnly ? 'Read Only' : 'Live Inline Sync'}
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              Drag column borders to resize. Drag & drop column headers to reorder. Freeze pane keeps Item Description visible when scrolling right.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Horizontal Swipe & Scroll Helper Pill */}
          <div className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold select-none shadow-2xs">
            <MoveHorizontal className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
            <span className="hidden sm:inline">Swipe left 👈 to scroll all columns</span>
            <span className="sm:hidden">Swipe 👈 👉</span>
            <div className="flex items-center gap-1 ml-1.5 border-l border-indigo-500/30 pl-2">
              <button
                type="button"
                onClick={() => scrollGridBy(-300)}
                className="p-1 hover:bg-white/20 active:bg-white/30 rounded transition cursor-pointer text-white"
                title="Scroll columns left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollGridBy(300)}
                className="p-1 hover:bg-white/20 active:bg-white/30 rounded transition cursor-pointer text-white"
                title="Scroll columns right (view all columns)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Freeze Pane Toggle */}
          <button
            onClick={() => setFreezeDescription(!freezeDescription)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer select-none ${
              freezeDescription
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Frozen Pane for Item Description & Article #"
          >
            <Pin className={`w-3.5 h-3.5 ${freezeDescription ? 'rotate-45 text-amber-300' : ''}`} />
            <span>{freezeDescription ? 'Pane Frozen: Description' : 'Freeze Description Pane'}</span>
          </button>

          {/* Reset Grid Layout */}
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
            title="Reset column widths and order back to defaults"
          >
            <Columns className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Grid Layout</span>
          </button>

          {/* Unsaved Edits Badge */}
          {!viewOnly && Object.keys(gridEdits).length > 0 && (
            <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 animate-pulse">
              <span>{Object.keys(gridEdits).length} Unsaved Row(s)</span>
            </div>
          )}

          {/* Batch Save Button */}
          {!viewOnly && (
            <button
              onClick={handleSaveAllGridEdits}
              disabled={Object.keys(gridEdits).length === 0 || isBatchSavingGrid}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition cursor-pointer ${
                Object.keys(gridEdits).length > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {isBatchSavingGrid ? (
                <Zap className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Save className="w-4 h-4 text-slate-950" />
              )}
              <span>{isBatchSavingGrid ? 'Saving...' : `Save All Changes (${Object.keys(gridEdits).length})`}</span>
            </button>
          )}

          {/* Discard All Button */}
          {!viewOnly && Object.keys(gridEdits).length > 0 && (
            <button
              onClick={handleDiscardAllGridEdits}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Discard all pending grid edits"
            >
              Discard
            </button>
          )}

          {/* Auto-Save Toggle */}
          {!viewOnly && (
            <label className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={gridAutoSave}
                onChange={(e) => setGridAutoSave(e.target.checked)}
                className="accent-emerald-500 rounded cursor-pointer"
              />
              <span className="font-medium">Auto-Sync on Change/Leave</span>
            </label>
          )}

          {/* Exit Grid Mode Button */}
          {onExitGridMode && (
            <button
              onClick={onExitGridMode}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              title={viewOnly ? "Exit Spreadsheet View" : "Exit Excel Grid Mode"}
            >
              <LogOut className="w-4 h-4" />
              <span>{viewOnly ? 'Exit Spreadsheet View' : 'Exit Grid Mode'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Alerts for Grid Actions */}
      {gridSavedToast && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{gridSavedToast}</span>
          </div>
          <button onClick={() => setGridSavedToast(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {gridSaveError && (
        <div className="bg-red-50 border-b border-red-200 text-red-900 px-4 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{gridSaveError}</span>
          </div>
          <button onClick={() => setGridSaveError(null)} className="text-red-700 hover:text-red-900 font-bold">✕</button>
        </div>
      )}

      {/* Batch Operations Bar */}
      {!viewOnly && (
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-semibold">
            <span>Quick Excel Tools:</span>
            <span className="text-slate-400 font-normal">
              Showing {filteredArticles.length} items • Drag header <GripVertical className="w-3 h-3 inline text-slate-400" /> to reorder columns • Drag edge <MoveHorizontal className="w-3 h-3 inline text-slate-400" /> to resize
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Set Location */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 ml-1" />
              <input
                type="text"
                list="grid-locations-list"
                placeholder="Bulk Location (e.g. WH-B2)..."
                value={batchLocationInput}
                onChange={(e) => setBatchLocationInput(e.target.value)}
                className="px-2 py-1 text-xs w-44 outline-none font-mono"
              />
              <datalist id="grid-locations-list">
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
              <button
                onClick={() => handleBulkApplyLocation(batchLocationInput)}
                disabled={!batchLocationInput.trim()}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded font-bold text-[11px] transition cursor-pointer"
              >
                Apply Location to {selectedArticleNumbers.length > 0 ? `${selectedArticleNumbers.length} Selected` : 'All Filtered'}
              </button>
            </div>

            {/* Quick Route Toggle */}
            <button
              onClick={() => {
                const targetNums = selectedArticleNumbers.length > 0 ? selectedArticleNumbers : filteredArticles.map(a => a.article_number);
                const updatedEdits = { ...gridEdits };
                targetNums.forEach(num => {
                  updatedEdits[num] = { ...(updatedEdits[num] || {}), ordering_channel: 'Central' };
                });
                setGridEdits(updatedEdits);
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" /> Set Central Route
            </button>

            <button
              onClick={() => {
                const targetNums = selectedArticleNumbers.length > 0 ? selectedArticleNumbers : filteredArticles.map(a => a.article_number);
                const updatedEdits = { ...gridEdits };
                targetNums.forEach(num => {
                  updatedEdits[num] = { ...(updatedEdits[num] || {}), ordering_channel: 'Local' };
                });
                setGridEdits(updatedEdits);
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-slate-600" /> Set Local Route
            </button>
          </div>
        </div>
      )}

      {/* High Density Editable Excel Grid with Resizable Columns & Drag-Drop Reordering */}
      <div
        ref={gridContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="overflow-x-auto max-h-[70vh] relative touch-pan-x overscroll-x-contain scrollbar-thin scroll-smooth"
      >
        <table className="w-full text-left border-collapse border-spacing-0 table-fixed">
          <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold border-b border-slate-300 shadow-2xs">
            <tr>
              {columnOrder.map((colKey) => {
                const width = columnWidths[colKey] || getColumnWidth(colKey, compact);
                const isFrozen = freezeDescription && FROZEN_KEYS.includes(colKey);
                const leftPos = isFrozen ? frozenLeftMap[colKey] : undefined;
                const isFrozenEdge = freezeDescription && colKey === lastFrozenColKey;

                const isDragging = draggedCol === colKey;
                const isDragOver = dragOverCol === colKey;

                return (
                  <th
                    key={colKey}
                    draggable={!resizingCol && colKey !== 'checkbox'}
                    onDragStart={(e) => handleDragStart(e, colKey)}
                    onDragOver={(e) => handleDragOver(e, colKey)}
                    onDragLeave={(e) => handleDragLeave(e, colKey)}
                    onDrop={(e) => handleDrop(e, colKey)}
                    onDragEnd={handleDragEnd}
                    className={`p-2.5 relative group select-none transition-colors ${
                      colKey === 'checkbox' ? 'text-center' : colKey === 'actions' ? 'text-right' : ''
                    } ${
                      isFrozen
                        ? 'sticky top-0 z-40 bg-slate-100'
                        : 'bg-slate-100 border-r border-slate-200'
                    } ${
                      isFrozenEdge
                        ? 'border-r-2 border-r-slate-400 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]'
                        : 'border-r border-slate-200'
                    } ${
                      isDragging ? 'opacity-40 bg-indigo-100' : ''
                    } ${
                      isDragOver ? 'border-l-4 border-l-indigo-600 bg-indigo-50' : ''
                    }`}
                    style={{
                      left: leftPos,
                      width,
                      minWidth: width,
                      maxWidth: width,
                    }}
                  >
                    <div className="flex items-center justify-between gap-1 pr-1 overflow-hidden">
                      <div className="flex items-center gap-1 overflow-hidden w-full">
                        {colKey !== 'checkbox' && (
                          <GripVertical
                            className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity"
                            title="Drag to reorder column"
                          />
                        )}
                        {renderHeaderContent(colKey)}
                      </div>
                    </div>

                    {/* Column Resizer Handle */}
                    <div
                      onMouseDown={(e) => handleResizeStart(colKey, e)}
                      onTouchStart={(e) => handleResizeStart(colKey, e)}
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-emerald-500 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Resize column"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-mono">
            {filteredArticles.length === 0 ? (
              <tr>
                <td colSpan={columnOrder.length} className="p-8 text-center text-slate-400 font-sans">
                  No articles found matching filters.
                </td>
              </tr>
            ) : (
              filteredArticles.map((article, idx) => {
                const rowEdit = gridEdits[article.article_number] || {};
                const isModified = Object.keys(rowEdit).length > 0;

                const stock = rowEdit.currentStock !== undefined ? rowEdit.currentStock : article.currentStock;
                const minQ = rowEdit.min_quantity !== undefined ? rowEdit.min_quantity : article.min_quantity;
                const reorder = rowEdit.reorder_level !== undefined ? rowEdit.reorder_level : article.reorder_level;

                const currentStockVal = Number(stock) || 0;
                const reorderVal = Number(reorder) || 0;
                const minVal = Number(minQ) || 0;
                let statusBadge = { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: '🟢 OK' };
                if (currentStockVal <= reorderVal) {
                  statusBadge = { bg: 'bg-red-100 text-red-800 border-red-300', text: '🔴 ALERT' };
                } else if (currentStockVal <= minVal * 1.2) {
                  statusBadge = { bg: 'bg-amber-100 text-amber-800 border-amber-300', text: '🟡 LOW' };
                }

                // Explicit row background for seamless frozen column rendering
                const rowBgClass = isModified
                  ? 'bg-amber-50'
                  : idx % 2 === 0
                  ? 'bg-white'
                  : 'bg-slate-50';

                return (
                  <tr
                    key={article.article_number}
                    className={`transition ${rowBgClass} hover:bg-amber-100/60`}
                  >
                    {columnOrder.map((colKey) => {
                      const width = columnWidths[colKey] || getColumnWidth(colKey, compact);
                      const isFrozen = freezeDescription && FROZEN_KEYS.includes(colKey);
                      const leftPos = isFrozen ? frozenLeftMap[colKey] : undefined;
                      const isFrozenEdge = freezeDescription && colKey === lastFrozenColKey;

                      return (
                        <td
                          key={colKey}
                          className={`p-1 ${
                            colKey === 'checkbox' ? 'text-center p-2' : colKey === 'actions' ? 'text-right p-2' : ''
                          } ${
                            colKey === 'article_number' ? 'font-bold text-slate-800 select-none p-2' : ''
                          } ${rowBgClass} ${
                            isFrozen ? 'sticky z-20' : ''
                          } ${
                            isFrozenEdge
                              ? 'border-r-2 border-r-slate-300 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]'
                              : 'border-r border-slate-200'
                          }`}
                          style={{
                            left: leftPos,
                            width,
                            minWidth: width,
                            maxWidth: width,
                          }}
                        >
                          {renderCellContent(colKey, article, rowEdit, isModified, statusBadge)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grid Footer Bar */}
      <div className="p-3 bg-slate-900 text-slate-200 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-emerald-400 font-bold">
            Total Articles: {filteredArticles.length}
          </span>
          {Object.keys(gridEdits).length > 0 && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-bold">
              {Object.keys(gridEdits).length} unsaved row(s)
            </span>
          )}
          {freezeDescription && (
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Pin className="w-3 h-3 text-indigo-400 rotate-45" /> Description Pane Frozen
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAllGridEdits}
            disabled={Object.keys(gridEdits).length === 0 || isBatchSavingGrid}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              Object.keys(gridEdits).length > 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All</span>
          </button>

          {onExitGridMode && (
            <button
              onClick={onExitGridMode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Grid Mode</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
