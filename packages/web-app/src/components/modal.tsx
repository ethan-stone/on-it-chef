"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-card rounded-2xl p-6 w-full max-w-md md:max-w-lg shadow-xl max-h-[90vh] overflow-y-auto animate-modal-in">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
          <h2 className="text-xl font-bold text-dark-brown">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-book-page hover:bg-border transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-medium-brown" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
