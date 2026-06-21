"use client";

import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastData {
  message: string;
  type: ToastType;
  visible: boolean;
}

let showToastFn: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "info") {
  if (showToastFn) showToastFn(message, type);
}

export function ToastContainer() {
  const [toast, setToast] = useState<ToastData>({ message: "", type: "info", visible: false });

  useEffect(() => {
    showToastFn = (message: string, type: ToastType) => {
      setToast({ message, type, visible: true });
    };
    return () => { showToastFn = null; };
  }, []);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  if (!toast.visible) return null;

  const bgColor =
    toast.type === "success"
      ? "bg-green-600"
      : toast.type === "error"
      ? "bg-red-600"
      : "bg-gray-800";

  const icon =
    toast.type === "success"
      ? "✓"
      : toast.type === "error"
      ? "✕"
      : "ℹ";

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
      <div
        className={`${bgColor} text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 min-w-[300px] max-w-md`}
      >
        <span className="text-lg font-bold">{icon}</span>
        <span className="text-sm font-medium flex-1">{toast.message}</span>
        <button
          onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
          className="text-white/70 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
