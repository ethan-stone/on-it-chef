"use client";

import React, { useState, useEffect } from "react";
import { useGetLoggedInUser, useUpdateUserSettings } from "@/api/users";
import { useToast } from "@/components/toast-context";
import { ProgressBar } from "@/components/progress-bar";
import { Modal } from "@/components/modal";
import {
  Settings as SettingsIcon,
  Mail,
  BarChart3,
  UtensilsCrossed,
  HelpCircle,
  Info,
  Pencil,
  ChevronRight,
  Loader2,
} from "lucide-react";

export default function SettingsPage() {
  const { data: user, isLoading } = useGetLoggedInUser();
  const { showToast } = useToast();
  const updateSettingsMutation = useUpdateUserSettings();
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    user?.dietaryRestrictions || ""
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (user?.dietaryRestrictions !== undefined) {
      setDietaryRestrictions(user.dietaryRestrictions || "");
    }
  }, [user?.dietaryRestrictions]);

  const handleSaveDietaryRestrictions = async () => {
    const newValue = editValue.trim() || undefined;

    setDietaryRestrictions(newValue || "");
    setModalVisible(false);

    try {
      await updateSettingsMutation.mutateAsync({
        dietaryRestrictions: newValue,
      });
      showToast("Dietary restrictions updated successfully!", "success");
    } catch {
      setDietaryRestrictions(user?.dietaryRestrictions || "");
      showToast(
        "Failed to update dietary restrictions. Please try again.",
        "error"
      );
    }
  };

  const handleEditDietaryRestrictions = () => {
    setEditValue(dietaryRestrictions);
    setModalVisible(true);
  };

  const getDietaryRestrictionsDisplay = () => {
    if (!user?.dietaryRestrictions || user.dietaryRestrictions.trim() === "") {
      return "No dietary restrictions set";
    }
    return user.dietaryRestrictions;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-border">
        <SettingsIcon className="w-7 h-7 text-medium-brown" />
        <h1 className="text-xl font-bold text-dark-brown">Settings</h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-medium-brown animate-spin mb-4" />
          <p className="text-medium-brown">Loading settings...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Account Section */}
          <div>
            <h2 className="text-sm font-semibold text-dark-brown uppercase tracking-wider mb-3">
              Account
            </h2>
            <div className="space-y-2">
              {/* Email */}
              <div className="flex items-center bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-book-page flex items-center justify-center mr-4">
                  <Mail className="w-5 h-5 text-medium-brown" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-dark-brown">Email</p>
                  <p className="text-sm text-medium-brown">
                    {user?.email || "No email set"}
                  </p>
                </div>
              </div>

              {/* Recipe Versions Limit */}
              <div className="flex items-center bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-book-page flex items-center justify-center mr-4">
                  <BarChart3 className="w-5 h-5 text-medium-brown" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-dark-brown">
                    Recipe Versions Limit
                  </p>
                  <p className="text-sm text-medium-brown mb-2">
                    You have{" "}
                    {(user?.recipeVersionsLimit || 0) -
                      (user?.remainingRecipeVersions || 0)}{" "}
                    recipe versions left
                  </p>
                  <ProgressBar
                    barColor="#5D4E37"
                    used={user?.remainingRecipeVersions || 0}
                    limit={user?.recipeVersionsLimit || 0}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div>
            <h2 className="text-sm font-semibold text-dark-brown uppercase tracking-wider mb-3">
              Preferences
            </h2>
            <div className="space-y-2">
              <button
                className="w-full flex items-center bg-card rounded-xl p-4 border border-border text-left cursor-pointer hover:shadow-md hover:border-medium-brown/30 transition-all"
                onClick={handleEditDietaryRestrictions}
              >
                <div className="w-10 h-10 rounded-full bg-book-page flex items-center justify-center mr-4">
                  <UtensilsCrossed className="w-5 h-5 text-medium-brown" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-dark-brown">
                    Dietary Restrictions
                  </p>
                  <p className="text-sm text-medium-brown">
                    {getDietaryRestrictionsDisplay()}
                  </p>
                </div>
                <Pencil className="w-5 h-5 text-medium-brown" />
              </button>
            </div>
          </div>

          {/* App Section */}
          <div>
            <h2 className="text-sm font-semibold text-dark-brown uppercase tracking-wider mb-3">
              App
            </h2>
            <div className="space-y-2">
              <div className="flex items-center bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-book-page flex items-center justify-center mr-4">
                  <HelpCircle className="w-5 h-5 text-medium-brown" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-dark-brown">
                    Help & Support
                  </p>
                  <p className="text-sm text-medium-brown">
                    Get help and contact support
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-medium-brown" />
              </div>

              <div className="flex items-center bg-card rounded-xl p-4 border border-border">
                <div className="w-10 h-10 rounded-full bg-book-page flex items-center justify-center mr-4">
                  <Info className="w-5 h-5 text-medium-brown" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-dark-brown">About</p>
                  <p className="text-sm text-medium-brown">Version 1.0.0</p>
                </div>
                <ChevronRight className="w-5 h-5 text-medium-brown" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dietary Restrictions Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Edit Dietary Restrictions"
      >
        <textarea
          className="w-full h-24 border border-border rounded-xl px-4 py-3 text-dark-brown bg-book-page placeholder-medium-brown/60 outline-none focus:border-medium-brown resize-none"
          placeholder="e.g., Vegetarian, Gluten-free, No dairy..."
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          autoFocus
        />
        <button
          className="w-full mt-4 py-3 rounded-xl bg-medium-brown text-book-page font-semibold hover:opacity-90 transition-opacity"
          onClick={handleSaveDietaryRestrictions}
        >
          Save
        </button>
      </Modal>
    </div>
  );
}
