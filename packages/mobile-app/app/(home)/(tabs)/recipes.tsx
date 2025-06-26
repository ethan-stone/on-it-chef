import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  useListRecipes,
  useCreateRecipe,
  useDeleteRecipe,
} from "@/api/recipes";
import { useGetLoggedInUser } from "@/api/users";
import { useRouter } from "expo-router";

export default function Recipes() {
  const router = useRouter();
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListRecipes();
  const { data: user } = useGetLoggedInUser();
  const createRecipeMutation = useCreateRecipe();
  const deleteRecipeMutation = useDeleteRecipe();
  const [modalVisible, setModalVisible] = useState(false);
  const [recipeMessage, setRecipeMessage] = useState("");
  const [inputError, setInputError] = useState("");

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
  const getRecipeName = (recipe: any) => {
    return recipe.userGivenName || recipe.generatedName;
  };

  // Helper function to get recipe description from the most recent version
  const getRecipeDescription = (recipe: any) => {
    if (recipe.recentVersions && recipe.recentVersions.length > 0) {
      return recipe.recentVersions[0].description;
    }
    return "No description available";
  };

  // Helper function to get total time (prep + cook)
  const getTotalTime = (recipe: any) => {
    if (recipe.recentVersions && recipe.recentVersions.length > 0) {
      const version = recipe.recentVersions[0];
      return formatTime(version.prepTime + version.cookTime);
    }
    return "Time not available";
  };

  // Handle creating a new recipe
  const handleCreateRecipe = async () => {
    setInputError("");
    if (!recipeMessage.trim()) {
      setInputError("Please describe the recipe you want.");
      return;
    }
    try {
      await createRecipeMutation.mutateAsync({
        visibility: "private",
        message: recipeMessage.trim(),
      });
      setModalVisible(false);
      setRecipeMessage("");
      Alert.alert("Success", "Recipe created successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to create recipe. Please try again.");
    }
  };

  // Handle deleting a recipe
  const handleDeleteRecipe = (recipe: any) => {
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
            try {
              await deleteRecipeMutation.mutateAsync(recipe.id);
              Alert.alert("Success", "Recipe deleted successfully!");
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to delete recipe. Please try again."
              );
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
  const renderRecipeItem = ({ item: recipe }: { item: any }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
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
            style={[
              styles.addButton,
              createRecipeMutation.isPending && styles.addButtonDisabled,
            ]}
            onPress={() => setModalVisible(true)}
            disabled={createRecipeMutation.isPending}
          >
            {createRecipeMutation.isPending ? (
              <ActivityIndicator size="small" color="#F8F6F1" />
            ) : (
              <Ionicons name="add" size={24} color="#F8F6F1" />
            )}
            <ThemedText style={styles.addButtonText}>
              {createRecipeMutation.isPending
                ? "Creating..."
                : "Add New Recipe"}
            </ThemedText>
          </TouchableOpacity>
        </View>
        {/* Create Recipe Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
            setRecipeMessage("");
          }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContainer}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <Ionicons name="restaurant" size={28} color="#8B7355" />
                    <ThemedText style={styles.modalTitle}>
                      Create New Recipe
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#8B7355" />
                    </TouchableOpacity>
                  </View>

                  {/* Modal Content */}
                  <View style={styles.modalContent}>
                    <ThemedText style={styles.modalSubtitle}>
                      Describe the recipe you&apos;d like to create
                    </ThemedText>

                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g., A spicy chicken curry with coconut milk and fresh herbs"
                      placeholderTextColor="#A69B8D"
                      value={recipeMessage}
                      onChangeText={setRecipeMessage}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />

                    {user?.dietaryRestrictions && (
                      <View style={styles.dietaryNote}>
                        <Ionicons
                          name="information-circle-outline"
                          size={16}
                          color="#8B7355"
                        />
                        <ThemedText style={styles.dietaryNoteText}>
                          Your dietary restrictions ({user.dietaryRestrictions})
                          will be automatically applied
                        </ThemedText>
                      </View>
                    )}

                    <ThemedText style={styles.modalHint}>
                      Be as detailed as possible for the best results!
                    </ThemedText>
                  </View>

                  {/* Modal Actions */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setModalVisible(false);
                        setRecipeMessage("");
                      }}
                    >
                      <ThemedText style={styles.cancelButtonText}>
                        Cancel
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.createButton]}
                      onPress={handleCreateRecipe}
                      disabled={createRecipeMutation.isPending}
                    >
                      {createRecipeMutation.isPending ? (
                        <ActivityIndicator size="small" color="#F8F6F1" />
                      ) : (
                        <Ionicons name="add" size={20} color="#F8F6F1" />
                      )}
                      <ThemedText style={styles.createButtonText}>
                        {createRecipeMutation.isPending
                          ? "Creating..."
                          : "Create"}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
  addButtonDisabled: {
    backgroundColor: "#A8A8A8", // Grayed out color
    opacity: 0.6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D0",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#5D4E37",
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: "#F8F6F1",
  },
  modalContent: {
    marginBottom: 24,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#8B7355",
    marginBottom: 16,
    lineHeight: 22,
  },
  modalInput: {
    height: 120,
    borderWidth: 2,
    borderColor: "#E8E0D0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#5D4E37",
    backgroundColor: "#F8F6F1",
    marginBottom: 12,
    textAlignVertical: "top",
  },
  modalHint: {
    color: "#8B7355",
    fontSize: 14,
    fontStyle: "italic",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#F8F6F1",
    borderWidth: 2,
    borderColor: "#E8E0D0",
  },
  createButton: {
    backgroundColor: "#8B7355",
  },
  cancelButtonText: {
    color: "#8B7355",
    fontSize: 16,
    fontWeight: "600",
  },
  createButtonText: {
    color: "#F8F6F1",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  dietaryNote: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dietaryNoteText: {
    marginLeft: 8,
    color: "#8B7355",
    fontSize: 14,
  },
});
