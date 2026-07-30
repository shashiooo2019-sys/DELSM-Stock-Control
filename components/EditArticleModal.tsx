'use client';

import React from 'react';
import { StockMaster, OrderingChannel } from '@/lib/db';
import { Trash2 } from 'lucide-react';

interface EditArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingArticle: StockMaster | null;
  articleForm: Omit<StockMaster, 'total_units_per_pack'>;
  setArticleForm: React.Dispatch<React.SetStateAction<Omit<StockMaster, 'total_units_per_pack'>>>;
  handleSaveArticle: (e: React.FormEvent) => void;
  handleDeleteArticle?: (article_number: string) => void;
  currentUser: { username: string; role: 'user' | 'admin' } | null;
}

export default function EditArticleModal({
  isOpen,
  onClose,
  editingArticle,
  articleForm,
  setArticleForm,
  handleSaveArticle,
  handleDeleteArticle,
  currentUser,
}: EditArticleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-800 font-display">
              {editingArticle ? 'Edit Article Master Specification' : 'Add New Article Master'}
            </h3>
            <p className="text-[11px] text-slate-500">Configure catalog properties and ordering specs.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-semibold cursor-pointer"
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

          <div className="grid grid-cols-3 gap-3">
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
              <label className="block text-slate-500 font-semibold mb-1">Min Order Qty (Free Text)</label>
              <input
                type="text"
                value={articleForm.min_order_qty || ''}
                onChange={(e) => setArticleForm({ ...articleForm, min_order_qty: e.target.value })}
                placeholder="e.g. 50 boxes, 1 pack"
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

          <div className="grid grid-cols-4 gap-2">
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
            {editingArticle && currentUser?.role === 'admin' && handleDeleteArticle ? (
              <button
                type="button"
                onClick={() => handleDeleteArticle(editingArticle.article_number)}
                className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2 rounded-lg border border-red-200 transition flex items-center gap-1.5 cursor-pointer"
                title="Delete Article Spec (Admin Access)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Article
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
              >
                Save Article Master
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
