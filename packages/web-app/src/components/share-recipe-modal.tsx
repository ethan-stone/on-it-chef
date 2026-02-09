"use client";

import React, { useState } from "react";
import { useShareRecipe } from "@/api/recipes";
import { useToast } from "@/components/toast-context";
import { Modal } from "@/components/modal";
import { Loader2 } from "lucide-react";

interface ShareRecipeModalProps {
  recipeId: string | null;
  onClose: () => void;
}

export function ShareRecipeModal({ recipeId, onClose }: ShareRecipeModalProps) {
  const { showToast } = useToast();
  const shareRecipeMutation = useShareRecipe();
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");

  const handleClose = () => {
    setShareEmail("");
    setShareError("");
    onClose();
  };

  const handleShare = async () => {
    setShareError("");
    if (!shareEmail.trim()) {
      setShareError("Please enter an email address.");
      return;
    }
    if (!recipeId) return;
    try {
      await shareRecipeMutation.mutateAsync({
        recipeId,
        shareWithEmail: shareEmail.trim(),
      });
      handleClose();
      showToast("Recipe shared successfully!", "success");
    } catch {
      setShareError("Failed to share recipe. Please try again.");
    }
  };

  return (
    <Modal visible={recipeId !== null} onClose={handleClose} title="Share Recipe">
      <p className="text-medium-brown mb-4">
        Enter the email address of the user you want to share this recipe with.
      </p>
      <input
        type="email"
        className="w-full border-2 border-border rounded-xl px-4 py-3 text-dark-brown bg-book-page placeholder-medium-brown/60 outline-none focus:border-medium-brown"
        placeholder="Enter email address"
        value={shareEmail}
        onChange={(e) => setShareEmail(e.target.value)}
      />
      {shareError && <p className="text-error text-sm mt-2">{shareError}</p>}
      <div className="flex gap-3 mt-6">
        <button
          className="flex-1 py-3 rounded-xl border-2 border-border text-medium-brown font-semibold hover:bg-book-page transition-colors cursor-pointer"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          className="flex-1 py-3 rounded-xl bg-medium-brown text-book-page font-semibold hover:bg-dark-brown transition-colors disabled:opacity-60 cursor-pointer"
          onClick={handleShare}
          disabled={shareRecipeMutation.isPending}
        >
          {shareRecipeMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            "Share"
          )}
        </button>
      </div>
    </Modal>
  );
}
