"use client";

import React, { useEffect } from 'react';
import { AlertIcon, CheckIcon } from './icons';

export type ToastState = { type: 'success' | 'error' | 'info'; message: string } | null;

const styles = {
  success: { bg: '#f0fdf4', border: '#86efac', color: '#166534' },
  error: { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
  info: { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af' },
};

export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  const s = styles[toast.type];

  return (
    <div
      role="status"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-[toastIn_.3s_ease-out]"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color }}
    >
      {toast.type === 'success' ? <CheckIcon className="w-4 h-4" /> : <AlertIcon color={s.color} />}
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} className="ml-2 opacity-60 hover:opacity-100" aria-label="Đóng thông báo">✕</button>
    </div>
  );
}
