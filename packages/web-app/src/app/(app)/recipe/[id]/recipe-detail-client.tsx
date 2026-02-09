"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGenerateRecipeVersion,
  useGetRecipeDetails,
  RecipeVersion,
} from "@/api/recipes";
import { useGetLoggedInUser } from "@/api/users";
import { useToast } from "@/components/toast-context";
import { Modal } from "@/components/modal";
import { ShareRecipeModal } from "@/components/share-recipe-modal";
import {
  ArrowLeft,
  Clock,
  Users,
  List,
  ChefHat,
  MessageSquare,
  Info,
  GitBranch,
  Share2,
  Loader2,
  PlusCircle,
  AlertCircle,
} from "lucide-react";

export function RecipeDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetLoggedInUser();

  const [newVersionMessage, setNewVersionMessage] = useState("");
  const [inputError, setInputError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const generateVersionMutation = useGenerateRecipeVersion();

  const {
    data: versionsData,
    isLoading: versionsLoading,
    error: versionsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetRecipeDetails(id);

  const isOwner = versionsData?.pages[0]?.isOwner ?? false;

  const allVersions = useMemo(
    () =>
      versionsData?.pages.flatMap((page) => page.versions.versions || []) || [],
    [versionsData?.pages]
  );

  const versionIdFromUrl = searchParams.get("version");

  const selectedVersion = useMemo(() => {
    if (allVersions.length === 0) return null;
    if (versionIdFromUrl) {
      const found = allVersions.find((v) => v.id === versionIdFromUrl);
      if (found) return found;
    }
    return allVersions[0];
  }, [allVersions, versionIdFromUrl]);

  const setSelectedVersion = useCallback(
    (version: RecipeVersion) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("version", version.id);
      router.replace(`/recipe/${id}?${params.toString()}`);
    },
    [router, id, searchParams]
  );

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0
      ? `${hours}h`
      : `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleForkRecipe = () => {
    if (!selectedVersion) return;
    router.push(`/fork-recipe?id=${id}&versionId=${selectedVersion.id}`);
  };

  const handleGenerateVersion = async () => {
    setInputError("");
    if (!newVersionMessage.trim()) {
      setInputError("Please describe the changes you want to make.");
      return;
    }

    try {
      await generateVersionMutation.mutateAsync({
        recipeId: id,
        message: newVersionMessage.trim(),
      });
      setModalVisible(false);
      setNewVersionMessage("");
      await queryClient.invalidateQueries({
        queryKey: ["recipe-details", id],
      });
      showToast("New recipe version generated successfully!", "success");
    } catch {
      showToast("Failed to generate new version. Please try again.", "error");
    }
  };

  if (versionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-medium-brown animate-spin mb-4" />
        <p className="text-medium-brown">Loading recipe...</p>
      </div>
    );
  }

  if (versionsError || allVersions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-12 h-12 text-medium-brown mb-4" />
        <p className="text-medium-brown">
          Failed to load recipe. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-14 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 p-1.5 hover:bg-border rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-medium-brown" />
          <span className="hidden md:inline text-sm text-medium-brown">
            Back
          </span>
        </button>
        <h1 className="text-lg font-semibold text-dark-brown flex-1 text-center truncate px-4">
          {selectedVersion?.generatedName || "Recipe"}
        </h1>
        {/* Desktop: inline action buttons */}
        <div className="hidden lg:flex items-center gap-1">
          <button
            onClick={handleForkRecipe}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-medium-brown hover:bg-border rounded-lg transition-colors cursor-pointer"
          >
            <GitBranch className="w-4 h-4" />
            Fork
          </button>
          {isOwner && (
            <button
              onClick={() => setShareModalVisible(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-medium-brown hover:bg-border rounded-lg transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}
        </div>
        {/* Mobile: spacer to keep title centered */}
        <div className="w-8 lg:hidden" />
      </div>

      {/* Version History */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-medium-brown" />
          <h2 className="text-lg font-semibold text-dark-brown">
            Version History
          </h2>
        </div>
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x lg:hidden">
          {allVersions.map((version) => (
            <button
              key={version.id}
              className={`shrink-0 w-48 p-4 rounded-xl border-2 text-left snap-start transition-colors cursor-pointer ${
                selectedVersion?.id === version.id
                  ? "border-medium-brown bg-book-page"
                  : "border-border bg-card hover:border-medium-brown/50"
              }`}
              onClick={() => setSelectedVersion(version)}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-medium-brown">
                  v{version.version}
                </span>
                <span className="text-xs text-medium-brown">
                  {formatDate(version.createdAt)}
                </span>
              </div>
              <p className="text-sm font-semibold text-dark-brown truncate mb-1">
                {version.generatedName}
              </p>
              <p className="text-xs text-medium-brown line-clamp-2">
                {version.description}
              </p>
            </button>
          ))}
          {hasNextPage && (
            <button
              className="shrink-0 w-20 flex items-center justify-center cursor-pointer"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 className="w-5 h-5 text-medium-brown animate-spin" />
              ) : (
                <span className="text-sm text-medium-brown">More...</span>
              )}
            </button>
          )}
        </div>

        {/* Desktop: vertical version list */}
        <div className="hidden lg:block">
          <div className="bg-card rounded-xl border border-border divide-y divide-border max-h-64 overflow-y-auto">
            {allVersions.map((version) => (
              <button
                key={version.id}
                className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                  selectedVersion?.id === version.id
                    ? "bg-book-page border-l-4 border-l-medium-brown"
                    : "hover:bg-book-page/50"
                }`}
                onClick={() => setSelectedVersion(version)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-medium-brown bg-book-page px-2 py-0.5 rounded">
                      v{version.version}
                    </span>
                    <span className="text-sm font-semibold text-dark-brown truncate">
                      {version.generatedName}
                    </span>
                  </div>
                  <span className="text-xs text-medium-brown shrink-0 ml-4">
                    {formatDate(version.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {hasNextPage && (
            <button
              className="w-full py-2 text-sm text-medium-brown hover:text-dark-brown transition-colors cursor-pointer mt-1"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                "Load more versions..."
              )}
            </button>
          )}
        </div>
      </div>

      {/* Current Version Info */}
      {selectedVersion && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm mb-6">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-xl font-bold text-dark-brown flex-1">
              {selectedVersion.generatedName}
            </h2>
            <span className="bg-medium-brown text-book-page text-xs font-semibold px-2.5 py-1 rounded-full ml-3">
              v{selectedVersion.version}
            </span>
          </div>
          <p className="text-medium-brown mb-4">
            {selectedVersion.description}
          </p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-sm text-medium-brown">
              <Clock className="w-4 h-4" />
              {formatTime(selectedVersion.prepTime + selectedVersion.cookTime)}
            </span>
            <span className="flex items-center gap-1 text-sm text-medium-brown">
              <Users className="w-4 h-4" />
              {selectedVersion.servings} servings
            </span>
          </div>
        </div>
      )}

      {/* Generate New Version Button */}
      {isOwner && (
        <div className="mb-6">
          <button
            className={`w-full md:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition-all cursor-pointer ${
              generateVersionMutation.isPending
                ? "bg-gray-400 opacity-60"
                : "bg-medium-brown hover:bg-dark-brown hover:shadow-md"
            } text-book-page`}
            onClick={() => setModalVisible(true)}
            disabled={generateVersionMutation.isPending}
          >
            {generateVersionMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <PlusCircle className="w-5 h-5" />
            )}
            {generateVersionMutation.isPending
              ? "Generating..."
              : "Generate New Version"}
          </button>
        </div>
      )}

      {/* Ingredients & Instructions — side by side on lg+ */}
      <div className="flex flex-col lg:flex-row lg:gap-6 mb-6">
        {/* Ingredients */}
        <div className="mb-6 lg:mb-0 lg:w-2/5 lg:shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <List className="w-5 h-5 text-medium-brown" />
            <h2 className="text-lg font-semibold text-dark-brown">
              Ingredients
            </h2>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border lg:sticky lg:top-6">
            {selectedVersion?.ingredients.map((ingredient, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 mb-2 last:mb-0"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-medium-brown mt-2 shrink-0" />
                <span className="text-dark-brown">
                  {ingredient.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="lg:flex-1">
          <div className="flex items-center gap-2 mb-3">
            <ChefHat className="w-5 h-5 text-medium-brown" />
            <h2 className="text-lg font-semibold text-dark-brown">
              Instructions
            </h2>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            {selectedVersion?.instructions.map(
              (instruction: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 mb-4 last:mb-0"
                >
                  <div className="w-6 h-6 rounded-full bg-medium-brown flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-book-page">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-dark-brown">{instruction}</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Original Prompt */}
      {selectedVersion && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-medium-brown" />
            <h2 className="text-lg font-semibold text-dark-brown">
              Original Prompt
            </h2>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-dark-brown italic">
              &ldquo;{selectedVersion.message}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Mobile: bottom action bar (sits above the nav bar) */}
      <div className="fixed bottom-14 left-0 right-0 bg-card border-t border-border z-20 flex lg:hidden">
        <button
          onClick={handleForkRecipe}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-medium-brown cursor-pointer hover:text-dark-brown transition-colors"
        >
          <GitBranch className="w-5 h-5" />
          Fork
        </button>
        {isOwner && (
          <button
            onClick={() => setShareModalVisible(true)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-medium-brown cursor-pointer hover:text-dark-brown transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        )}
      </div>

      {/* Generate New Version Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setNewVersionMessage("");
        }}
        title="Generate New Version"
      >
        <p className="text-medium-brown mb-4">
          Describe the changes you&apos;d like to make to this recipe
        </p>
        <textarea
          className="w-full h-24 border-2 border-border rounded-xl px-4 py-3 text-dark-brown bg-book-page placeholder-medium-brown/60 outline-none focus:border-medium-brown resize-none"
          placeholder="e.g., Make it spicier, add more vegetables, reduce cooking time..."
          value={newVersionMessage}
          onChange={(e) => setNewVersionMessage(e.target.value)}
        />
        {user?.dietaryRestrictions && (
          <div className="flex items-center gap-2 mt-2">
            <Info className="w-4 h-4 text-medium-brown" />
            <span className="text-sm text-medium-brown">
              Your dietary restrictions ({user.dietaryRestrictions}) will be
              automatically applied
            </span>
          </div>
        )}
        {inputError && <p className="text-error text-sm mt-2">{inputError}</p>}
        <div className="flex gap-3 mt-6">
          <button
            className="flex-1 py-3 rounded-xl border-2 border-border text-medium-brown font-semibold hover:bg-book-page transition-colors"
            onClick={() => {
              setModalVisible(false);
              setNewVersionMessage("");
            }}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-3 rounded-xl bg-medium-brown text-book-page font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            onClick={handleGenerateVersion}
            disabled={generateVersionMutation.isPending}
          >
            {generateVersionMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Generate"
            )}
          </button>
        </div>
      </Modal>

      <ShareRecipeModal
        recipeId={shareModalVisible ? id : null}
        onClose={() => setShareModalVisible(false)}
      />
    </div>
  );
}
