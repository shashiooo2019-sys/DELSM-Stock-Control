'use client';

import React, { useState, useRef } from 'react';
import { StockMaster, OrderingChannel } from '@/lib/db';
import { Camera, Upload, CheckCircle2, Image as ImageIcon, Trash2, X, RefreshCw, AlertCircle } from 'lucide-react';

interface EditArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingArticle: StockMaster | null;
  articleForm: Omit<StockMaster, 'total_units_per_pack'>;
  setArticleForm: React.Dispatch<React.SetStateAction<Omit<StockMaster, 'total_units_per_pack'>>>;
  handleSaveArticle: (e: React.FormEvent) => void;
  handleDeleteArticle?: (article_number: string) => void;
  currentUser: { username: string; role: 'user' | 'admin' } | null;
  getItemPhotoPath: (article_number?: string, image_url?: string) => string;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onPhotoUploaded?: (articleNumber: string, newUrl: string, base64?: string) => void;
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
  getItemPhotoPath,
  handleImgError,
  onPhotoUploaded,
}: EditArticleModalProps) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);
  const [photoErrorMsg, setPhotoErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  if (!isOpen) return null;

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

  const uploadPhotoData = async (base64Data: string) => {
    const artNum = articleForm.article_number || 'ITEM';
    setIsUploadingPhoto(true);
    setPhotoErrorMsg(null);
    setPhotoSuccessMsg(null);

    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_number: artNum,
          image_base64: base64Data,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      const freshUrl = data.image_url || `/inventory/${artNum}.jpg?t=${Date.now()}`;
      setArticleForm((prev) => ({
        ...prev,
        image_url: freshUrl,
        image_base64: base64Data,
      }));

      if (onPhotoUploaded) {
        onPhotoUploaded(artNum, freshUrl, base64Data);
      }

      setPhotoSuccessMsg(`Photo saved to repository (/public/inventory/${artNum}.jpg)`);
      setTimeout(() => setPhotoSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setPhotoErrorMsg(err.message || 'Error uploading photo to repository');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImageFile(file);
      await uploadPhotoData(compressedBase64);
    } catch (err: any) {
      setPhotoErrorMsg('Failed to process selected file');
    }
  };

  const startCamera = async () => {
    try {
      setPhotoErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      console.error('Error starting camera:', err);
      setPhotoErrorMsg('Could not access device camera. Please check camera permissions or use file upload.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureCameraPhoto = async () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/webp', 0.8);
      stopCamera();
      await uploadPhotoData(dataUrl);
    } catch (err: any) {
      setPhotoErrorMsg('Error capturing image from camera');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-800 font-display">
              {editingArticle ? 'Edit Article Master Specification' : 'Add New Article Master'}
            </h3>
            <p className="text-[11px] text-slate-500">Configure catalog properties, ordering specs, and repository photo.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
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

          {/* ITEM PHOTO MANAGEMENT SECTION IN EDIT MODE */}
          <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-slate-700 font-bold text-xs flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" /> Repository Item Photo
              </label>
              <span className="text-[10px] text-amber-800 font-mono bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                Stored in /public/inventory
              </span>
            </div>

            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 shrink-0 bg-slate-100 flex items-center justify-center">
                <img
                  src={getItemPhotoPath(articleForm.article_number, articleForm.image_url)}
                  alt="Item photo"
                  onError={handleImgError}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-2">
                <div className="text-[11px] text-slate-600 font-mono">
                  <span className="font-semibold text-slate-800">Target Path:</span>{' '}
                  /public/inventory/{articleForm.article_number || 'ARTICLE_ID'}.jpg
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isUploadingPhoto ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Upload Photo
                  </button>

                  {!isCameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isUploadingPhoto}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[11px] px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      Take Photo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-[11px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Close Camera
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LIVE CAMERA CAPTURE BOX */}
            {isCameraActive && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-slate-400">Position item clearly in front of camera</span>
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    disabled={isUploadingPhoto}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Capture & Save Photo
                  </button>
                </div>
              </div>
            )}

            {photoSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {photoSuccessMsg}
              </div>
            )}

            {photoErrorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                {photoErrorMsg}
              </div>
            )}
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
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
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
