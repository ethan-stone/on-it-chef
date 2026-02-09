"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForkRecipe, useGetRecipeDetails } from "@/api/recipes";
import { useGetLoggedInUser } from "@/api/users";
import { useToast } from "@/components/toast-context";
import {
  ArrowLeft,
  ChefHat,
  UtensilsCrossed,
  Pencil,
  CheckCircle,
  XCircle,
  GitBranch,
  Clock,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function ForkRecipePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const versionId = searchParams.get("versionId") || "";
  const { showToast } = useToast();
  const { data: user } = useGetLoggedInUser();
  const forkRecipeMutation = useForkRecipe();
  const { data: versionsData } = useGetRecipeDetails(id);

  const [forkPrompt, setForkPrompt] = useState("");
  const [inputError, setInputError] = useState("");
  const [includeDietaryRestrictions, setIncludeDietaryRestrictions] =
    useState(true);
  const [customDietaryRestrictions, setCustomDietaryRestrictions] =
    useState("");
  const [showCustomDietary, setShowCustomDietary] = useState(false);

  const allVersions =
    versionsData?.pages.flatMap((page) => page.versions.versions || []) || [];
  const sourceVersion: (typeof allVersions)[number] | undefined =
    allVersions.find((v) => v.id === versionId) || allVersions[0];

  const handleForkRecipe = async () => {
    setInputError("");
    if (!forkPrompt.trim()) {
      setInputError("Please describe the changes you want to make.");
      return;
    }

    if (!sourceVersion) {
      setInputError("Source recipe version not found.");
      return;
    }

    try {
      const forkedRecipe = await forkRecipeMutation.mutateAsync({
        sourceRecipeId: id,
        sourceVersionId: sourceVersion.id,
        userPrompt: forkPrompt.trim(),
        visibility: "private",
        includeDietaryRestrictions: includeDietaryRestrictions,
        customDietaryRestrictions: showCustomDietary
          ? customDietaryRestrictions.trim()
          : undefined,
      });

      showToast("Recipe forked successfully!", "success");
      router.push(`/recipe/${forkedRecipe.id}`);
    } catch {
      showToast("Failed to fork recipe. Please try again.", "error");
    }
  };

  if (!sourceVersion) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-medium-brown animate-spin mb-4" />
        <p className="text-medium-brown">Loading recipe...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 p-1.5 hover:bg-border rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-medium-brown" />
          <span className="hidden md:inline text-sm text-medium-brown">Back</span>
        </button>
        <h1 className="text-lg font-semibold text-dark-brown">Fork Recipe</h1>
        <div className="w-8" />
      </div>

      {/* Source Recipe Info */}
      <div className="mb-6 pb-6 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <ChefHat className="w-6 h-6 text-medium-brown" />
          <h2 className="text-lg font-semibold text-dark-brown">
            Source Recipe
          </h2>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-lg font-semibold text-dark-brown mb-2">
            {sourceVersion.generatedName}
          </h3>
          <p className="text-sm text-medium-brown mb-3">
            {sourceVersion.description}
          </p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-sm text-medium-brown">
              <Clock className="w-4 h-4" />
              {sourceVersion.prepTime + sourceVersion.cookTime} min
            </span>
            <span className="flex items-center gap-1 text-sm text-medium-brown">
              <Users className="w-4 h-4" />
              {sourceVersion.servings} servings
            </span>
            <span className="flex items-center gap-1 text-sm text-medium-brown">
              <GitBranch className="w-4 h-4" />
              v{sourceVersion.version}
            </span>
          </div>
        </div>
      </div>

      {/* Fork Description */}
      <div className="mb-6 pb-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <Pencil className="w-6 h-6 text-medium-brown" />
          <h2 className="text-lg font-semibold text-dark-brown">
            Describe Changes
          </h2>
        </div>
        <p className="text-medium-brown mb-4">
          Describe the changes you&apos;d like to make to this recipe. Be
          specific about what you want to modify.
        </p>
        <textarea
          className="w-full h-32 md:h-40 border-2 border-border rounded-xl px-4 py-3 text-dark-brown bg-card placeholder-medium-brown/60 outline-none focus:border-medium-brown focus:ring-1 focus:ring-medium-brown/30 resize-none transition-colors"
          placeholder="e.g., Make it vegetarian by replacing chicken with tofu, add more vegetables, reduce the spice level..."
          value={forkPrompt}
          onChange={(e) => {
            setForkPrompt(e.target.value);
            if (inputError) setInputError("");
          }}
        />
        {inputError && (
          <div className="flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4 text-error" />
            <span className="text-error text-sm">{inputError}</span>
          </div>
        )}
      </div>

      {/* Dietary Restrictions */}
      <div className="mb-6 pb-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <UtensilsCrossed className="w-6 h-6 text-medium-brown" />
          <h2 className="text-lg font-semibold text-dark-brown">
            Dietary Restrictions
          </h2>
        </div>

        {!user ? (
          <div className="flex items-center gap-2 justify-center py-4">
            <Loader2 className="w-5 h-5 text-medium-brown animate-spin" />
            <span className="text-medium-brown">
              Loading dietary preferences...
            </span>
          </div>
        ) : !user.dietaryRestrictions ? (
          <p className="text-medium-brown">
            You haven&apos;t set any dietary restrictions yet. You can add them
            in your settings.
          </p>
        ) : (
          <>
            <p className="text-medium-brown mb-4">
              Choose how to handle dietary restrictions for this forked recipe.
            </p>

            <button
              className={`w-full text-left p-4 rounded-xl border-2 mb-3 transition-colors cursor-pointer ${
                includeDietaryRestrictions && !showCustomDietary
                  ? "border-medium-brown bg-book-page"
                  : "border-border bg-card"
              }`}
              onClick={() => {
                setIncludeDietaryRestrictions(true);
                setShowCustomDietary(false);
              }}
            >
              <div className="flex items-center gap-3 mb-1">
                <CheckCircle
                  className={`w-5 h-5 ${
                    includeDietaryRestrictions && !showCustomDietary
                      ? "text-medium-brown"
                      : "text-border"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    includeDietaryRestrictions && !showCustomDietary
                      ? "text-medium-brown"
                      : "text-dark-brown"
                  }`}
                >
                  Use my default restrictions
                </span>
              </div>
              <p className="text-sm text-medium-brown ml-8">
                {user.dietaryRestrictions}
              </p>
            </button>

            <button
              className={`w-full text-left p-4 rounded-xl border-2 mb-3 transition-colors cursor-pointer ${
                !includeDietaryRestrictions && !showCustomDietary
                  ? "border-medium-brown bg-book-page"
                  : "border-border bg-card"
              }`}
              onClick={() => {
                setIncludeDietaryRestrictions(false);
                setShowCustomDietary(false);
              }}
            >
              <div className="flex items-center gap-3 mb-1">
                <XCircle
                  className={`w-5 h-5 ${
                    !includeDietaryRestrictions && !showCustomDietary
                      ? "text-medium-brown"
                      : "text-border"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    !includeDietaryRestrictions && !showCustomDietary
                      ? "text-medium-brown"
                      : "text-dark-brown"
                  }`}
                >
                  No dietary restrictions
                </span>
              </div>
              <p className="text-sm text-medium-brown ml-8">
                Create the recipe without any dietary restrictions
              </p>
            </button>

            <button
              className={`w-full text-left p-4 rounded-xl border-2 mb-3 transition-colors cursor-pointer ${
                showCustomDietary
                  ? "border-medium-brown bg-book-page"
                  : "border-border bg-card"
              }`}
              onClick={() => {
                setShowCustomDietary(true);
                setIncludeDietaryRestrictions(false);
              }}
            >
              <div className="flex items-center gap-3 mb-1">
                <Pencil
                  className={`w-5 h-5 ${
                    showCustomDietary ? "text-medium-brown" : "text-border"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    showCustomDietary ? "text-medium-brown" : "text-dark-brown"
                  }`}
                >
                  Custom restrictions
                </span>
              </div>
              <p className="text-sm text-medium-brown ml-8">
                Specify custom dietary restrictions for this recipe
              </p>
            </button>

            {showCustomDietary && (
              <textarea
                className="w-full h-20 border-2 border-border rounded-xl px-4 py-3 text-dark-brown bg-card placeholder-medium-brown/60 outline-none focus:border-medium-brown focus:ring-1 focus:ring-medium-brown/30 resize-none mt-1 transition-colors"
                placeholder="e.g., vegan, nut-free, gluten-free, low-sodium"
                value={customDietaryRestrictions}
                onChange={(e) => setCustomDietaryRestrictions(e.target.value)}
              />
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 md:justify-end">
        <button
          className="flex-1 md:flex-none md:px-8 py-4 rounded-xl border-2 border-border text-medium-brown font-semibold hover:bg-book-page transition-colors cursor-pointer"
          onClick={() => router.back()}
        >
          Cancel
        </button>
        <button
          className={`flex-[2] md:flex-none md:px-12 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            forkRecipeMutation.isPending
              ? "bg-gray-400 opacity-60"
              : "bg-medium-brown hover:bg-dark-brown"
          } text-book-page`}
          onClick={handleForkRecipe}
          disabled={forkRecipeMutation.isPending}
        >
          {forkRecipeMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <GitBranch className="w-5 h-5" />
          )}
          {forkRecipeMutation.isPending ? "Forking..." : "Fork Recipe"}
        </button>
      </div>
    </div>
  );
}
