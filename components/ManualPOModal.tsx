'use client';

import React from 'react';
import { StockMaster, PurchaseOrder } from '@/lib/db';
import { Plus, ShoppingCart } from 'lucide-react';

interface ManualPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockMaster: StockMaster[];
  filteredArticles: any[];
  manualPOForm: {
    article_number: string;
    order_quantity_units: number;
    lead_time_days: number;
  };
  setManualPOForm: React.Dispatch<React.SetStateAction<{
    article_number: string;
    order_quantity_units: number;
    lead_time_days: number;
  }>>;
  quantityError: string;
  setQuantityError: (err: string) => void;
  handleCreateManualPO: (e: React.FormEvent) => void;
}

export default function ManualPOModal({
  isOpen,
  onClose,
  stockMaster,
  filteredArticles,
  manualPOForm,
  setManualPOForm,
  quantityError,
  setQuantityError,
  handleCreateManualPO,
}: ManualPOModalProps) {
  if (!isOpen) return null;

  const selectedArticle = stockMaster.find((item) => item.article_number === manualPOForm.article_number);
  const computedArticle = filteredArticles.find((a) => a.article_number === manualPOForm.article_number);
  const suggestedQty = computedArticle ? Math.max(0, computedArticle.max_quantity - computedArticle.currentStock) : 0;

  let packagingText = '';
  if (selectedArticle) {
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
    packagingText = parts.join(' + ');
  }

  return (
    <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-base text-slate-900 font-display">
              Create Manual Purchase Order
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-semibold cursor-pointer"
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
                const article = stockMaster.find((m) => m.article_number === e.target.value);
                if (article) {
                  setManualPOForm({
                    ...manualPOForm,
                    article_number: e.target.value,
                    order_quantity_units: article.order_volume,
                    lead_time_days: article.lead_time_days,
                  });
                }
              }}
              className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 text-slate-800 font-sans focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition outline-none"
              required
            >
              {stockMaster.map((item) => (
                <option key={item.article_number} value={item.article_number}>
                  {item.article_number} - {item.description}
                </option>
              ))}
            </select>
          </div>

          {computedArticle && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-amber-900">Suggested Order Qty:</div>
                <div className="text-[10px] text-slate-500">
                  To reach Maximum Capacity ({(computedArticle.max_quantity ?? 0).toLocaleString()} units)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-800 text-xs">
                  {(suggestedQty ?? 0) > 0 ? `${(suggestedQty ?? 0).toLocaleString()} units` : 'Fully Stocked (Standard Recommended)'}
                </span>
                {suggestedQty > 0 && (
                  <button
                    type="button"
                    onClick={() => setManualPOForm({ ...manualPOForm, order_quantity_units: suggestedQty })}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-1 rounded text-[10px] font-bold shadow-xs transition cursor-pointer"
                  >
                    Use Suggested
                  </button>
                )}
              </div>
            </div>
          )}

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

          {selectedArticle && packagingText && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 font-mono text-[11px]">
              <span className="font-semibold text-slate-800 block mb-0.5">Equivalent Packaging Breakdown:</span>
              {packagingText}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg transition text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg transition text-xs shadow-sm cursor-pointer"
            >
              Create Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
