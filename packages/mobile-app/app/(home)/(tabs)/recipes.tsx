import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useListRecipes } from "@/api/recipes";

export default function Recipes() {
  const { data, isLoading, error } = useListRecipes();

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
          /* Recipe List */
          <ScrollView
            style={styles.recipeList}
            showsVerticalScrollIndicator={false}
          >
            {data?.recipes && data.recipes.length > 0 ? (
              data.recipes.map((recipe) => (
                <TouchableOpacity key={recipe.id} style={styles.recipeCard}>
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
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#8B7355"
                        />
                        <ThemedText style={styles.metaText}>
                          {getTotalTime(recipe)}
                        </ThemedText>
                      </View>
                      {recipe.recentVersions &&
                        recipe.recentVersions.length > 0 && (
                          <View style={styles.metaItem}>
                            <Ionicons
                              name="people-outline"
                              size={16}
                              color="#8B7355"
                            />
                            <ThemedText style={styles.metaText}>
                              {recipe.recentVersions[0].servings} servings
                            </ThemedText>
                          </View>
                        )}
                    </View>
                  </View>

                  <View style={styles.recipeArrow}>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#8B7355"
                    />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="restaurant-outline" size={64} color="#8B7355" />
                <ThemedText style={styles.emptyTitle}>
                  No recipes yet
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  Start by adding your first recipe!
                </ThemedText>
              </View>
            )}
          </ScrollView>
        )}

        {/* Add Recipe Button */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.addButton}>
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
  },
  recipeContent: {
    flex: 1,
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
});
