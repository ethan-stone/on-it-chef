"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient, InfiniteData } from "@tanstack/react-query";
import {
  useListRecipes,
  useDeleteRecipe,
  Recipe,
  fetchRecipeDetails,
  useSearchRecipes,
  useListSharedRecipes,
} from "@/api/recipes";
import { useToast } from "@/components/toast-context";
import { ShareRecipeModal } from "@/components/share-recipe-modal";
import { RecipeListSkeleton } from "@/components/recipe-card-skeleton";
import {
  ChefHat,
  Search,
  X,
  Clock,
  Users,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  MoreHorizontal,
  GitBranch,
  Share2,
} from "lucide-react";

export function RecipesClient() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"my" | "shared">("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shareRecipeId, setShareRecipeId] = useState<string | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListRecipes();

  const {
    data: sharedData,
    isLoading: sharedIsLoading,
    error: sharedError,
    fetchNextPage: fetchNextSharedPage,
    hasNextPage: hasNextSharedPage,
    isFetchingNextPage: isFetchingNextSharedPage,
  } = useListSharedRecipes();

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
  } = useSearchRecipes(debouncedSearchQuery);

  const deleteRecipeMutation = useDeleteRecipe();

  const isSearching =
    debouncedSearchQuery.trim().length > 0 && activeTab === "my";
  const currentData = isSearching
    ? searchData
    : activeTab === "my"
    ? data
    : sharedData;
  const currentIsLoading = isSearching
    ? isSearchLoading
    : activeTab === "my"
    ? isLoading
    : sharedIsLoading;
  const currentError = isSearching
    ? searchError
    : activeTab === "my"
    ? error
    : sharedError;

  const allRecipes =
    (currentData?.pages.flatMap((page) => page.recipes || []) as Recipe[]) ||
    [];

  // Infinite scroll observer
  const handleLoadMore = useCallback(() => {
    if (isSearching) return;
    if (activeTab === "my" && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    } else if (
      activeTab === "shared" &&
      hasNextSharedPage &&
      !isFetchingNextSharedPage
    ) {
      fetchNextSharedPage();
    }
  }, [
    isSearching,
    activeTab,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    hasNextSharedPage,
    isFetchingNextSharedPage,
    fetchNextSharedPage,
  ]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [handleLoadMore]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0
      ? `${hours}h`
      : `${hours}h ${remainingMinutes}m`;
  };

  const getRecipeName = (recipe: Recipe) =>
    recipe.userGivenName || recipe.generatedName;

  const getRecipeDescription = (recipe: Recipe) => {
    if (recipe.recentVersions && recipe.recentVersions.length > 0) {
      return recipe.recentVersions[0].description;
    }
    return "No description available";
  };

  const getTotalTime = (recipe: Recipe) => {
    if (recipe.recentVersions && recipe.recentVersions.length > 0) {
      const version = recipe.recentVersions[0];
      return formatTime(version.prepTime + version.cookTime);
    }
    return "N/A";
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    const recipeName = getRecipeName(recipe);

    if (
      !confirm(
        `Delete "${recipeName}"? This action cannot be undone and will delete all versions of this recipe.`
      )
    ) {
      return;
    }

    // Optimistic update
    queryClient.setQueryData(
      ["recipes"],
      (oldData: InfiniteData<{ recipes: Recipe[]; hasMore: boolean }>) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            recipes: page.recipes.filter((r) => r.id !== recipe.id),
          })),
        };
      }
    );

    if (isSearching) {
      queryClient.setQueryData(
        ["search-recipes", debouncedSearchQuery],
        (
          oldData: InfiniteData<{ recipes: Recipe[]; hasMore: boolean }>
        ) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              recipes: page.recipes.filter((r) => r.id !== recipe.id),
            })),
          };
        }
      );
    }

    showToast("Recipe deleted successfully!", "success");

    try {
      await deleteRecipeMutation.mutateAsync(recipe.id);
    } catch {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      if (isSearching) {
        queryClient.invalidateQueries({
          queryKey: ["search-recipes", debouncedSearchQuery],
        });
      }
      showToast("Failed to delete recipe. Please try again.", "error");
    }
  };

  const handlePrefetch = (recipeId: string) => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ["recipe-details", recipeId],
      queryFn: async ({ pageParam = 1 }) => {
        return fetchRecipeDetails(recipeId, pageParam, getToken);
      },
      getNextPageParam: (
        lastPage: Awaited<ReturnType<typeof fetchRecipeDetails>>,
        allPages: Awaited<ReturnType<typeof fetchRecipeDetails>>[]
      ) => {
        if (lastPage.versions.hasMore) {
          return allPages.length + 1;
        }
        return undefined;
      },
      initialPageParam: 1,
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
        <ChefHat className="w-7 h-7 text-medium-brown" />
        <h1 className="text-xl font-bold text-dark-brown">Recipes</h1>
      </div>

      {/* Tabs */}
      <div className="flex mb-4 max-w-sm">
        <button
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-3 transition-colors cursor-pointer ${
            activeTab === "my"
              ? "border-medium-brown text-dark-brown"
              : "border-transparent text-medium-brown"
          }`}
          onClick={() => setActiveTab("my")}
        >
          My Recipes
        </button>
        <button
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-3 transition-colors cursor-pointer ${
            activeTab === "shared"
              ? "border-medium-brown text-dark-brown"
              : "border-transparent text-medium-brown"
          }`}
          onClick={() => setActiveTab("shared")}
        >
          Shared
        </button>
      </div>

      {/* Search Bar */}
      {activeTab === "my" && (
        <div className="mb-4">
          <div className="flex items-center bg-card rounded-xl px-4 py-3 border border-border">
            <Search className="w-5 h-5 text-medium-brown" />
            <input
              type="text"
              placeholder="Search recipes..."
              className="flex-1 ml-2 bg-transparent text-dark-brown placeholder-medium-brown outline-none text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 rounded-full cursor-pointer hover:bg-border transition-colors"
              >
                <X className="w-5 h-5 text-medium-brown" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {currentIsLoading ? (
        <RecipeListSkeleton />
      ) : currentError ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-12 h-12 text-medium-brown mb-4" />
          <p className="text-medium-brown text-center">
            {isSearching
              ? "Failed to search recipes. Please try again."
              : "Failed to load recipes. Please try again."}
          </p>
        </div>
      ) : allRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <ChefHat className="w-16 h-16 text-medium-brown mb-4" />
          <h3 className="text-lg font-semibold text-dark-brown mb-2">
            {isSearching
              ? "No recipes found"
              : activeTab === "my"
              ? "No recipes yet"
              : "No shared recipes"}
          </h3>
          <p className="text-medium-brown text-center">
            {isSearching
              ? `No recipes match "${debouncedSearchQuery}"`
              : activeTab === "my"
              ? "Start by adding your first recipe!"
              : "Recipes shared with you will appear here"}
          </p>
        </div>
      ) : (
        <>
          {openMenuId && (
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpenMenuId(null)}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/recipe/${recipe.id}`}
              className="group flex flex-col bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative"
              onMouseEnter={() => handlePrefetch(recipe.id)}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-dark-brown mb-1 truncate pr-8">
                  {getRecipeName(recipe)}
                </h3>
                <p className="text-sm text-medium-brown line-clamp-2 mb-3">
                  {getRecipeDescription(recipe)}
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <span className="flex items-center gap-1 text-sm text-medium-brown">
                    <Clock className="w-4 h-4" />
                    {getTotalTime(recipe)}
                  </span>
                  {recipe.recentVersions &&
                    recipe.recentVersions.length > 0 && (
                      <span className="flex items-center gap-1 text-sm text-medium-brown">
                        <Users className="w-4 h-4" />
                        {recipe.recentVersions[0].servings} servings
                      </span>
                    )}
                </div>
              </div>

              <div className="absolute top-2 right-2 z-10">
                <button
                  className="p-2 rounded-lg bg-book-page hover:bg-border transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuId(
                      openMenuId === recipe.id ? null : recipe.id
                    );
                  }}
                >
                  <MoreHorizontal className="w-4 h-4 text-medium-brown" />
                </button>

                {openMenuId === recipe.id && (
                    <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-40 w-44 py-1 animate-fade-in">
                      <button
                        className="flex items-center gap-3 px-4 py-3 w-full hover:bg-book-page transition-colors cursor-pointer text-left"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(null);
                          const versionId =
                            recipe.recentVersions?.[0]?.id || "";
                          router.push(
                            `/fork-recipe?id=${recipe.id}&versionId=${versionId}`
                          );
                        }}
                      >
                        <GitBranch className="w-4 h-4 text-medium-brown" />
                        <span className="text-sm text-dark-brown">Fork</span>
                      </button>
                      {activeTab === "my" && (
                        <button
                          className="flex items-center gap-3 px-4 py-3 w-full hover:bg-book-page transition-colors cursor-pointer text-left"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setShareRecipeId(recipe.id);
                          }}
                        >
                          <Share2 className="w-4 h-4 text-medium-brown" />
                          <span className="text-sm text-dark-brown">
                            Share
                          </span>
                        </button>
                      )}
                      {activeTab === "my" && (
                        <button
                          className="flex items-center gap-3 px-4 py-3 w-full hover:bg-book-page transition-colors cursor-pointer text-left"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleDeleteRecipe(recipe);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                          <span className="text-sm text-error">Delete</span>
                        </button>
                      )}
                    </div>
                )}
              </div>
            </Link>
          ))}

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-1" />

          {/* Loading more indicator */}
          {(isFetchingNextPage || isFetchingNextSharedPage) && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-medium-brown animate-spin mr-2" />
              <span className="text-medium-brown">
                Loading more recipes...
              </span>
            </div>
          )}
          </div>
        </>
      )}

      <ShareRecipeModal
        recipeId={shareRecipeId}
        onClose={() => setShareRecipeId(null)}
      />

      {/* Add Recipe Button */}
      {activeTab === "my" && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 lg:right-6">
          <button
            onClick={() => router.push("/create-recipe")}
            className="flex items-center gap-2 bg-medium-brown text-book-page py-3 px-5 rounded-xl font-semibold shadow-lg hover:bg-dark-brown hover:shadow-xl transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Add New Recipe
          </button>
        </div>
      )}
    </div>
  );
}
