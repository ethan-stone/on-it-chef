"use client";

import React, { useCallback, useEffect } from "react";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  onHide: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type,
  onHide,
  duration = 3000,
}) => {
  const hideToast = useCallback(() => {
    onHide();
  }, [onHide]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, hideToast, duration]);

  if (!visible) return null;

  const config = {
    success: {
      bg: "bg-success",
      icon: <CheckCircle className="w-5 h-5 text-white" />,
    },
    error: {
      bg: "bg-[#F44336]",
      icon: <AlertCircle className="w-5 h-5 text-white" />,
    },
    info: {
      bg: "bg-info",
      icon: <Info className="w-5 h-5 text-white" />,
    },
  }[type];

  return (
    <div
      className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 ${config.bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in`}
    >
      {config.icon}
      <span className="text-sm font-medium flex-1">{message}</span>
    </div>
  );
};
