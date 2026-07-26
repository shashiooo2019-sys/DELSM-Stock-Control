'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  LogIn, 
  Package, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Box, 
  Layers, 
  Maximize2, 
  X, 
  Barcode, 
  RotateCcw,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import { StockMaster, StockTakingLog, PurchaseOrder } from '@/lib/db';
import { fuzzySearch } from '@/lib/search';

export default function PublicSearch({ 
  stockMaster = [], 
  stockTakingLog = [],
  purchaseOrders = [],
  onLoginClick 
}: { 
  stockMaster: StockMaster[], 
  stockTakingLog?: StockTakingLog[],
  purchaseOrders?: PurchaseOrder[],
  onLoginClick: () => void
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Healthy' | 'Low' | 'Action Needed' | 'Suppressed'>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Map article numbers to latest count log date
  const latestCountDates = useMemo(() => {
    const map: Record<string, string> = {};
    if (!stockTakingLog || stockTakingLog.length === 0) return map;

    // Sort by timestamp descending
    const sorted = [...stockTakingLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    sorted.forEach(log => {
      if (!map[log.article_number]) {
        map[log.article_number] = log.timestamp;
      }
    });
    return map;
  }, [stockTakingLog]);

  // Map article numbers to active PO status
  const activePOMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!purchaseOrders) return map;
    purchaseOrders.forEach(po => {
      if (['Raised', 'Approved', 'Pending'].includes(po.status)) {
        map[po.article_number] = true;
      }
    });
    return map;
  }, [purchaseOrders]);

  // Extract unique cupboard locations for filter
  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    stockMaster.forEach(item => {
      if (item.location && item.location.trim()) {
        locs.add(item.location.trim());
      }
    });
    return Array.from(locs).sort();
  }, [stockMaster]);

  // Perform fuzzy search
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return stockMaster.map(item => ({ item, score: 1 }));
    }
    return fuzzySearch(query, stockMaster);
  }, [query, stockMaster]);

  // Helper function to derive item health status
  const getItemStatus = React.useCallback((item: StockMaster) => {
    const isSuppressed = activePOMap[item.article_number];
    const stock = item.total_stock_quantity ?? 0;
    const minQty = item.min_quantity ?? 0;
    const reorderLvl = item.reorder_level ?? 0;

    if (isSuppressed) return 'Suppressed';
    if (stock <= minQty || stock === 0) return 'Action Needed';
    if (stock <= reorderLvl) return 'Low';
    return 'Healthy';
  }, [activePOMap]);

  // Filter items by status and location
  const filteredArticles = useMemo(() => {
    return searchResults.filter(({ item }) => {
      const status = getItemStatus(item);

      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Healthy' && status !== 'Healthy') return false;
        if (statusFilter === 'Low' && status !== 'Low') return false;
        if (statusFilter === 'Action Needed' && status !== 'Action Needed') return false;
        if (statusFilter === 'Suppressed' && status !== 'Suppressed') return false;
      }

      // Location filter
      if (locationFilter !== 'All') {
        if ((item.location || 'UNALLOCATED') !== locationFilter) return false;
      }

      return true;
    });
  }, [searchResults, statusFilter, locationFilter, getItemStatus]);

  return (
    <div className="min-h-screen bg-slate-100/80 p-4 md:p-8 text-slate-800 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Navigation Bar */}
        <div className="bg-slate-900 text-white p-5 md:p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-500 text-slate-950 p-2 rounded-xl shadow-md font-black">
                <Package className="w-6 h-6" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Inventory Search Portal
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium pl-10">
              Live Stock Master Catalog & Physical Verification Records
            </p>
          </div>

          <button 
            onClick={onLoginClick}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-lg cursor-pointer shrink-0 border border-amber-300 active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Staff Sign In</span>
          </button>
        </div>

        {/* Search & Filter Controls Panel */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles by description, article number, barcode, or location..."
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/80 focus:border-amber-500 bg-slate-50/50"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Location Filter Dropdown */}
            <div className="flex items-center gap-2 min-w-[220px]">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full py-2.5 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="All">All Locations / Cupboards</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>Location: {loc}</option>
                ))}
                <option value="UNALLOCATED">UNALLOCATED</option>
              </select>
            </div>
          </div>

          {/* Status Filter Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-slate-400" /> Filter:
              </span>

              {(['All', 'Healthy', 'Low', 'Action Needed', 'Suppressed'] as const).map((st) => {
                const isActive = statusFilter === st;
                let activeStyle = 'bg-slate-800 text-white shadow-xs';
                if (st === 'Healthy' && isActive) activeStyle = 'bg-emerald-600 text-white shadow-xs';
                if (st === 'Low' && isActive) activeStyle = 'bg-amber-500 text-white shadow-xs';
                if (st === 'Action Needed' && isActive) activeStyle = 'bg-red-600 text-white shadow-xs';
                if (st === 'Suppressed' && isActive) activeStyle = 'bg-indigo-600 text-white shadow-xs';

                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isActive ? activeStyle : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'All' && 'All Stock Items'}
                    {st === 'Healthy' && '🟢 Healthy'}
                    {st === 'Low' && '🟡 Low Stock'}
                    {st === 'Action Needed' && '🔴 Action Needed'}
                    {st === 'Suppressed' && '⏳ Suppressed (PO Active)'}
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-bold text-slate-500 font-mono">
              Showing <span className="text-slate-900 font-black">{filteredArticles.length}</span> of {stockMaster.length} items
            </div>
          </div>
        </div>

        {/* Gallery Cards View */}
        {filteredArticles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No matching stock items found</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search text or switching status filters.</p>
            <button
              onClick={() => { setQuery(''); setStatusFilter('All'); setLocationFilter('All'); }}
              className="mt-4 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All Search Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredArticles.map(({ item }) => {
              const photoSrc = item.image_base64 || item.image_url;
              const status = getItemStatus(item);

              // Status styles
              let statusBadgeText = '🟢 Healthy Stock';
              let borderAccent = 'border-t-emerald-500 hover:border-emerald-600';
              let badgeBg = 'bg-emerald-500 text-white border-emerald-400';
              let stockTextCol = 'text-emerald-700';

              if (status === 'Action Needed') {
                statusBadgeText = '🔴 Action Needed';
                borderAccent = 'border-t-red-500 hover:border-red-600';
                badgeBg = 'bg-red-600 text-white border-red-500 animate-pulse';
                stockTextCol = 'text-red-700';
              } else if (status === 'Suppressed') {
                statusBadgeText = '⏳ Suppressed (PO Active)';
                borderAccent = 'border-t-amber-500 hover:border-amber-600';
                badgeBg = 'bg-amber-500 text-white border-amber-400';
                stockTextCol = 'text-amber-800';
              } else if (status === 'Low') {
                statusBadgeText = '🟡 Low Stock';
                borderAccent = 'border-t-amber-500 hover:border-amber-600';
                badgeBg = 'bg-amber-500 text-white border-amber-400';
                stockTextCol = 'text-amber-700';
              }

              // Latest count date
              const lastCountRaw = latestCountDates[item.article_number];
              let formattedCountDate = 'Initial Master Record';
              if (lastCountRaw) {
                try {
                  const d = new Date(lastCountRaw);
                  formattedCountDate = d.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                } catch {
                  formattedCountDate = lastCountRaw;
                }
              }

              return (
                <div 
                  key={`public-item-${item.article_number}`}
                  className={`group bg-white border border-slate-200 border-t-4 ${borderAccent} rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden relative`}
                >
                  <div>
                    {/* Item Image Container */}
                    <div className="relative h-44 w-full bg-slate-900 overflow-hidden flex items-center justify-center group/img">
                      {photoSrc ? (
                        <img 
                          src={photoSrc} 
                          alt={item.description} 
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => setLightboxImageUrl(photoSrc)}
                          onError={(e) => {
                            (e.target as any).src = "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&auto=format&fit=crop&q=80";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
                          <Package className="w-10 h-10 text-slate-600 mb-1" />
                          <span className="text-[11px] text-slate-400 font-medium">No Image Uploaded</span>
                        </div>
                      )}

                      {/* Dark overlay for overlay text */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                      {/* Status Badge Tag */}
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-md flex items-center gap-1 border ${badgeBg}`}>
                          {statusBadgeText}
                        </span>
                      </div>

                      {/* Expand Image Button */}
                      {photoSrc && (
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(photoSrc)}
                          className="absolute top-2.5 left-2.5 z-10 bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-lg backdrop-blur-xs transition border border-white/20 cursor-pointer"
                          title="View image full size"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Location / Cupboard Tag */}
                      <div className="absolute bottom-2.5 left-2.5 z-10 max-w-[80%] truncate">
                        <span className="bg-slate-900/90 backdrop-blur-xs text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono flex items-center gap-1.5 truncate shadow-sm">
                          <MapPin className="w-3 h-3 shrink-0 text-amber-400" />
                          <span className="truncate">Cupboard: {item.location || 'UNALLOCATED'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      {/* Article Number Header & Barcode */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 tracking-wide">
                          Art #{item.article_number}
                        </span>
                        {item.barcode && (
                          <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                            <Barcode className="w-3 h-3 text-slate-400" />
                            {item.barcode}
                          </span>
                        )}
                      </div>

                      {/* Item Description Title */}
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug hover:text-amber-600 transition" title={item.description}>
                        {item.description}
                      </h3>

                      {/* Total Stock Quantity Display */}
                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Stock</span>
                          <div className="text-right">
                            <span className={`font-mono text-2xl font-black ${stockTextCol}`}>
                              {(item.total_stock_quantity ?? 0).toLocaleString()}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 ml-1">
                              {item.smallest_unit_name || 'units'}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Free Text Spec if available */}
                        {item.quantity_details && (
                          <div className="text-[11px] text-slate-700 font-sans border-t border-slate-200/60 pt-1.5 flex items-start gap-1">
                            <FileText className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 font-medium">{item.quantity_details}</span>
                          </div>
                        )}
                      </div>

                      {/* Packaging Hierarchy Specs (Units/Box, Boxes/Pack) & Reordering Level */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/80">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Units in Box / Pad</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                            <Box className="w-3 h-3 text-amber-600 shrink-0" />
                            {item.units_per_box || 1} {item.smallest_unit_name || 'units'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Boxes in Pack</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                            <Layers className="w-3 h-3 text-indigo-600 shrink-0" />
                            {item.boxes_per_pack || 1} boxes
                          </span>
                        </div>

                        <div className="col-span-2 border-t border-amber-200/50 pt-1.5 mt-0.5 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-500">Reordering Level:</span>
                          <span className="font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200/80 text-[11px]">
                            {(item.reorder_level ?? 0).toLocaleString()} {item.smallest_unit_name || 'units'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Last Date of Count Taken */}
                  <div className="p-3 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-500 font-medium flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Last Count Date:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800 truncate" title={formattedCountDate}>
                      {formattedCountDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox Modal for enlarged picture viewing */}
        {lightboxImageUrl && (
          <div 
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setLightboxImageUrl(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh] w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setLightboxImageUrl(null)}
                className="absolute -top-10 right-0 text-white hover:text-amber-400 bg-black/60 p-2 rounded-full cursor-pointer transition border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={lightboxImageUrl}
                alt="Enlarged view"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-700"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
