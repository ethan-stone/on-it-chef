"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateRecipe } from "@/api/recipes";
import { useGetLoggedInUser } from "@/api/users";
import { useToast } from "@/components/toast-context";
import {
  ArrowLeft,
  ChefHat,
  UtensilsCrossed,
  CheckCircle,
  XCircle,
  Pencil,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function CreateRecipePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: user } = useGetLoggedInUser();
  const createRecipeMutation = useCreateRecipe();

  const [recipeMessage, setRecipeMessage] = useState("");
  const [inputError, setInputError] = useState("");
  const [includeDietaryRestrictions, setIncludeDietaryRestrictions] =
    useState(true);
  const [customDietaryRestrictions, setCustomDietaryRestrictions] =
    useState("");
  const [showCustomDietary, setShowCustomDietary] = useState(false);

  const handleCreateRecipe = async () => {
    setInputError("");
    if (!recipeMessage.trim()) {
      setInputError("Please describe the recipe you want to create.");
      return;
    }

    try {
      const newRecipe = await createRecipeMutation.mutateAsync({
        visibility: "private",
        message: recipeMessage.trim(),
        includeDietaryRestrictions: includeDietaryRestrictions,
        customDietaryRestrictions: showCustomDietary
          ? customDietaryRestrictions.trim()
          : undefined,
      });

      showToast("Recipe created successfully!", "success");
      router.push(`/recipe/${newRecipe.id}`);
    } catch {
      showToast("Failed to create recipe. Please try again.", "error");
    }
  };

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
        <h1 className="text-lg font-semibold text-dark-brown">
          Create New Recipe
        </h1>
        <div className="w-8" />
      </div>

      {/* Recipe Description Section */}
      <div className="mb-6 pb-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <ChefHat className="w-6 h-6 text-medium-brown" />
          <h2 className="text-lg font-semibold text-dark-brown">
            Recipe Description
          </h2>
        </div>
        <p className="text-medium-brown mb-4">
          Describe the recipe you&apos;d like to create. Be as detailed as
          possible to get the best results.
        </p>
        <textarea
          className="w-full h-32 md:h-40 border-2 border-border rounded-xl px-4 py-3 text-dark-brown bg-card placeholder-medium-brown/60 outline-none focus:border-medium-brown focus:ring-1 focus:ring-medium-brown/30 resize-none transition-colors"
          placeholder="e.g., A spicy chicken curry with coconut milk, fresh herbs, and vegetables. I want it to be moderately spicy and serve 4 people."
          value={recipeMessage}
          onChange={(e) => {
            setRecipeMessage(e.target.value);
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

      {/* Dietary Restrictions Section */}
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
              Choose how to handle dietary restrictions for this recipe.
            </p>

            {/* Use defaults */}
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

            {/* No restrictions */}
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

            {/* Custom restrictions */}
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
            createRecipeMutation.isPending
              ? "bg-gray-400 opacity-60"
              : "bg-medium-brown hover:bg-dark-brown"
          } text-book-page`}
          onClick={handleCreateRecipe}
          disabled={createRecipeMutation.isPending}
        >
          {createRecipeMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          {createRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
        </button>
      </div>
    </div>
  );
}
