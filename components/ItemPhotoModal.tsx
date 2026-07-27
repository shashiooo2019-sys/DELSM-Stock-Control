'use client';

import React, { useState, useRef } from 'react';
import { StockMaster } from '@/lib/db';
import { CheckCircle2, Maximize2, Upload, Camera, RefreshCw, X } from 'lucide-react';

interface ItemPhotoModalProps {
  article: StockMaster | null;
  onClose: () => void;
  getItemPhotoPath: (article_number?: string, image_url?: string) => string;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  setLightboxImageUrl: (url: string | null) => void;
  onPhotoUploaded?: (articleNumber: string, newUrl: string, base64?: string) => void;
}

export default function ItemPhotoModal({
  article,
  onClose,
  getItemPhotoPath,
  handleImgError,
  setLightboxImageUrl,
  onPhotoUploaded,
}: ItemPhotoModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!article) return null;

  const currentPhoto = customPhotoUrl || getItemPhotoPath(article.article_number, article.image_url);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const compressedBase64 = await compressImageFile(file);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_number: article.article_number,
          image_base64: compressedBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      const freshUrl = data.image_url || `/inventory/${article.article_number}.jpg?t=${Date.now()}`;
      setCustomPhotoUrl(freshUrl);
      if (onPhotoUploaded) {
        onPhotoUploaded(article.article_number, freshUrl, compressedBase64);
      }
      setSuccessMsg(`Photo updated in repository (/public/inventory/${article.article_number}.jpg)`);
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setErrorMsg(err.message || 'Error saving photo to repository');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 font-display">Item Photo Details</h3>
            <p className="text-[11px] text-slate-500 font-mono">{article.article_number} — {article.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="relative group">
              <img
                src={currentPhoto}
                alt={article.description}
                onError={handleImgError}
                className="w-52 h-52 object-cover rounded-xl border border-slate-300 shadow-md cursor-pointer"
                onClick={() => setLightboxImageUrl(currentPhoto)}
                title="Click to expand view"
              />
              <button
                type="button"
                onClick={() => setLightboxImageUrl(currentPhoto)}
                className="absolute bottom-2 right-2 bg-black/60 hover:bg-black text-white p-2 rounded-lg opacity-90 transition shadow cursor-pointer"
                title="Expand Fullscreen View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-1 w-full px-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Repository Asset
              </span>
              <p className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-200 mt-2 truncate">
                /public/inventory/{article.article_number}.jpg
              </p>
            </div>
          </div>

          {/* Quick upload photo in photo details modal */}
          <div className="flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Update / Replace Photo in Repository
            </button>

            {successMsg && (
              <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-center font-medium">
                {successMsg}
              </p>
            )}
            {errorMsg && (
              <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg border border-red-200 text-center">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition shadow cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
