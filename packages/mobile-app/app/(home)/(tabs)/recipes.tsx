import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import {
  useListRecipes,
  useDeleteRecipe,
  Recipe,
  fetchRecipeDetails,
} from "@/api/recipes";
import { useRouter } from "expo-router";
import { useToast } from "@/components/ToastContext";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { ThemedView } from "@/components/ThemedView";

export default function Recipes() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListRecipes();
  const deleteRecipeMutation = useDeleteRecipe();

  // Flatten all pages of recipes into a single array
  const allRecipes = data?.pages.flatMap((page) => page.recipes || []) || [];

  // Helper function to format time in minutes to readable format
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  // Helper function to get recipe name
  const getRecipeName = (recipe: Recipe) => {
    return recipe.userGivenName || recipe.generatedName;
  };

  // Helper function to get recipe description from the most recent version
  const getRecipeDescription = (recipe: Recipe) => {
    if (recipe.recentVersions && recipe.recentVersions.length > 0) {
      return recipe.recentVersions[0].description;
    }
    return "No description available";
  };

  // Helper function to get total time (prep + cook)
  const getTotalTime = (recipe: Recipe) => {
    if (recipe.recentVersions && recipe.recentVersions.length > 0) {
      const version = recipe.recentVersions[0];
      return formatTime(version.prepTime + version.cookTime);
    }
    return "Time not available";
  };

  // Handle deleting a recipe
  const handleDeleteRecipe = (recipe: Recipe) => {
    const recipeName = getRecipeName(recipe);

    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipeName}"? This action cannot be undone and will delete all versions of this recipe.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Optimistic update - immediately remove from cache
            queryClient.setQueryData(["recipes"], (oldData: any) => {
              if (!oldData) return oldData;

              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  recipes: page.recipes.filter((r: any) => r.id !== recipe.id),
                })),
              };
            });

            // Show immediate success feedback
            showToast("Recipe deleted successfully!", "success");

            try {
              await deleteRecipeMutation.mutateAsync(recipe.id);
            } catch (error) {
              console.error(error);
              // Revert optimistic update on error
              queryClient.invalidateQueries({ queryKey: ["recipes"] });
              showToast("Failed to delete recipe. Please try again.", "error");
            }
          },
        },
      ]
    );
  };

  // Handle loading more recipes
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Render individual recipe item
  const renderRecipeItem = ({ item: recipe }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      onPressIn={async () => {
        console.log(`🔄 [PREFETCH] Starting prefetch for recipe ${recipe.id}`);
        await queryClient.prefetchInfiniteQuery({
          queryKey: ["recipe-details", recipe.id],
          queryFn: async ({ pageParam = 1 }) => {
            return fetchRecipeDetails(recipe.id, pageParam, getToken);
          },
          getNextPageParam: (
            lastPage: Awaited<ReturnType<typeof fetchRecipeDetails>>, // for some reason this needs to be explicitly typed
            allPages: Awaited<ReturnType<typeof fetchRecipeDetails>>[] // for some reason this needs to be explicitly typed
          ) => {
            // If there are more versions, return the next page number
            if (lastPage.versions.hasMore) {
              return allPages.length + 1;
            }
            return undefined; // No more pages
          },
          initialPageParam: 1,
        });
        console.log(
          `✅ [PREFETCH] Successfully prefetched recipe ${recipe.id}`
        );
      }}
    >
      <View style={styles.recipeContent}>
        <View style={styles.recipeHeader}>
          <ThemedText style={styles.recipeTitle}>
            {getRecipeName(recipe)}
          </ThemedText>
        </View>

        <ThemedText style={styles.recipeDescription}>
          {getRecipeDescription(recipe)}
        </ThemedText>

        <View style={styles.recipeMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color="#8B7355" />
            <ThemedText style={styles.metaText}>
              {getTotalTime(recipe)}
            </ThemedText>
          </View>
          {recipe.recentVersions && recipe.recentVersions.length > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color="#8B7355" />
              <ThemedText style={styles.metaText}>
                {recipe.recentVersions[0].servings} servings
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.recipeArrow}>
        <Ionicons name="chevron-forward" size={20} color="#8B7355" />
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          handleDeleteRecipe(recipe);
        }}
      >
        <Ionicons name="trash-outline" size={20} color="#D32F2F" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render loading indicator for next page
  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#8B7355" />
        <ThemedText style={styles.loadingMoreText}>
          Loading more recipes...
        </ThemedText>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="restaurant-outline" size={64} color="#8B7355" />
      <ThemedText style={styles.emptyTitle}>No recipes yet</ThemedText>
      <ThemedText style={styles.emptyText}>
        Start by adding your first recipe!
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="restaurant" size={32} color="#8B7355" />
            <ThemedText style={styles.headerTitle}>My Recipes</ThemedText>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#8B7355" />
            <ThemedText style={styles.searchPlaceholder}>
              Search recipes...
            </ThemedText>
          </View>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B7355" />
            <ThemedText style={styles.loadingText}>
              Loading recipes...
            </ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#8B7355" />
            <ThemedText style={styles.errorText}>
              Failed to load recipes. Please try again.
            </ThemedText>
          </View>
        ) : (
          /* Recipe List with Infinite Scroll */
          <FlatList
            data={allRecipes}
            renderItem={renderRecipeItem}
            keyExtractor={(item) => item.id}
            style={styles.recipeList}
            contentContainerStyle={styles.recipeListContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyState}
          />
        )}

        {/* Add Recipe Button */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/create-recipe")}
          >
            <Ionicons name="add" size={24} color="#F8F6F1" />
            <ThemedText style={styles.addButtonText}>Add New Recipe</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F6F1", // Book page color
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F6F1", // Book page color
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D0", // Light border
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5D4E37", // Dark brown text
    marginLeft: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E8E0D0",
  },
  searchPlaceholder: {
    marginLeft: 8,
    color: "#8B7355", // Medium brown text
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#8B7355",
    marginTop: 16,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#8B7355",
    marginTop: 16,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#5D4E37",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#8B7355",
    textAlign: "center",
  },
  recipeList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recipeCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E0D0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  recipeContent: {
    flex: 1,
    marginRight: 8,
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5D4E37", // Dark brown text
    flex: 1,
  },
  recipeDescription: {
    fontSize: 14,
    color: "#8B7355", // Medium brown text
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#8B7355", // Medium brown text
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F8F6F1",
    zIndex: 1,
  },
  recipeArrow: {
    justifyContent: "center",
    marginLeft: 8,
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8E0D0",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B7355", // Medium brown
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  addButtonText: {
    color: "#F8F6F1", // Light book page color
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingMoreText: {
    color: "#8B7355",
    fontSize: 16,
    marginLeft: 8,
  },
  recipeListContent: {
    paddingBottom: 16,
  },
});
