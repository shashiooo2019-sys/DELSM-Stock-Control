import React from 'react';
import { StockMaster } from '@/lib/db';

interface StockGridProps {
  filteredArticles: StockMaster[];
  compact: boolean;
  onExitGridMode?: () => void;
}

export const StockGrid = ({ filteredArticles, compact, onExitGridMode }: StockGridProps) => {
  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
      {filteredArticles.map((article) => {
        const dailyBurn = article.dailyBurn || 0;
        const stock = article.currentStock ?? 0;
        const daysCover = dailyBurn > 0 ? (stock || 0) / dailyBurn : 999;
        const isBelowLead = dailyBurn > 0 && daysCover <= (article.lead_time_days || 0);

        return (
          <div key={article.article_number} className={`bg-white border rounded-lg p-4 shadow-sm ${isBelowLead ? 'border-red-500' : ''}`}>
            <h3 className={`font-bold text-slate-800 mb-1 ${compact ? 'text-[10px] truncate' : 'text-sm'}`} title={article.description}>
              {article.description}
            </h3>
            
            <div className="text-xs text-slate-600 space-y-1">
              <div>{!compact && <span className="font-semibold">Article: </span>}{article.article_number}</div>
              <div>{!compact && <span className="font-semibold">Location: </span>}{article.location || 'N/A'}</div>
              <div>{!compact && <span className="font-semibold">Stock: </span>}{stock}</div>
              {!compact && (
                <>
                  <div><span className="font-semibold">Barcode:</span> {article.barcode}</div>
                  <div><span className="font-semibold">Quantity Details:</span> {article.quantity_details || 'N/A'}</div>
                  <div><span className="font-semibold">Burn Rate:</span> {dailyBurn.toFixed(1)}/day</div>
                  <div><span className="font-semibold">Add Info:</span> {article.add_info || 'N/A'}</div>
                </>
              )}
            </div>
            
            <div className="text-sm font-bold mt-3">
              {!compact && <span className="font-semibold text-slate-700 mr-2">Days Left:</span>}
              <span className={`ml-2 px-2 py-1 rounded ${isBelowLead ? 'animate-flash-red-text font-extrabold text-lg' : 'text-slate-800'}`}>
                {daysCover.toFixed(1)}
              </span>
            </div>
            {isBelowLead && <div className="text-red-600 font-bold text-xs mt-1 animate-pulse">CRITICAL STOCK LEVEL</div>}
          </div>
        );
      })}
    </div>
  );
};
