import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

// Example recipe data
const exampleRecipes = [
  {
    id: 1,
    title: "Classic Margherita Pizza",
    description: "Fresh mozzarella, basil, and tomato sauce on crispy crust",
    cookTime: "25 min",
    difficulty: "Easy",
    rating: 4.8,
  },
  {
    id: 2,
    title: "Chicken Tikka Masala",
    description: "Creamy, spiced chicken in rich tomato sauce",
    cookTime: "45 min",
    difficulty: "Medium",
    rating: 4.9,
  },
  {
    id: 3,
    title: "Chocolate Chip Cookies",
    description: "Soft and chewy cookies with chocolate chips",
    cookTime: "20 min",
    difficulty: "Easy",
    rating: 4.7,
  },
  {
    id: 4,
    title: "Beef Stir Fry",
    description: "Quick and flavorful beef with vegetables",
    cookTime: "15 min",
    difficulty: "Easy",
    rating: 4.6,
  },
  {
    id: 5,
    title: "Caesar Salad",
    description: "Fresh romaine with classic Caesar dressing",
    cookTime: "10 min",
    difficulty: "Easy",
    rating: 4.5,
  },
];

export default function Recipes() {
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

        {/* Recipe List */}
        <ScrollView
          style={styles.recipeList}
          showsVerticalScrollIndicator={false}
        >
          {exampleRecipes.map((recipe) => (
            <TouchableOpacity key={recipe.id} style={styles.recipeCard}>
              <View style={styles.recipeContent}>
                <View style={styles.recipeHeader}>
                  <ThemedText style={styles.recipeTitle}>
                    {recipe.title}
                  </ThemedText>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <ThemedText style={styles.ratingText}>
                      {recipe.rating}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText style={styles.recipeDescription}>
                  {recipe.description}
                </ThemedText>

                <View style={styles.recipeMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color="#8B7355" />
                    <ThemedText style={styles.metaText}>
                      {recipe.cookTime}
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="trending-up-outline"
                      size={16}
                      color="#8B7355"
                    />
                    <ThemedText style={styles.metaText}>
                      {recipe.difficulty}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.recipeArrow}>
                <Ionicons name="chevron-forward" size={20} color="#8B7355" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#8B7355", // Medium brown text
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
