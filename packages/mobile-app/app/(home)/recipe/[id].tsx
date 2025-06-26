import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

export default function RecipeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for now
  const recipe = {
    id: id as string,
    userGivenName: "Spicy Chicken Curry",
    generatedName: "Spicy Chicken Curry with Coconut Milk",
    recentVersions: [
      {
        id: "version_1",
        version: 1,
        description:
          "A flavorful chicken curry with aromatic spices and creamy coconut milk",
        prepTime: 20,
        cookTime: 45,
        servings: 4,
        ingredients: [
          "2 lbs chicken breast, cubed",
          "1 can coconut milk",
          "2 tbsp curry powder",
          "1 onion, diced",
          "3 cloves garlic, minced",
        ],
        instructions: [
          "Heat oil in a large pot over medium heat",
          "Add diced onion and cook until translucent",
          "Add garlic and ginger, cook for 1 minute",
          "Add chicken and cook until browned",
        ],
        createdAt: new Date(),
      },
    ],
    prompts: [
      {
        id: "prompt_1",
        message:
          "Create a spicy chicken curry recipe with coconut milk and aromatic spices",
        createdAt: new Date(),
      },
    ],
  };

  const mostRecentVersion = recipe.recentVersions[0];
  const originalPrompt = recipe.prompts[0];

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0
      ? `${hours}h`
      : `${hours}h ${remainingMinutes}m`;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      Alert.alert("Error", "Please enter a message");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setNewMessage("");
      Alert.alert("Success", "New recipe version generated! (Demo only)");
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#8B7355" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {recipe.userGivenName || recipe.generatedName}
          </ThemedText>
          <TouchableOpacity style={styles.historyButton}>
            <Ionicons name="time-outline" size={24} color="#8B7355" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recipe Info */}
          <View style={styles.recipeInfoCard}>
            <View style={styles.recipeHeader}>
              <ThemedText style={styles.recipeTitle}>
                {recipe.userGivenName || recipe.generatedName}
              </ThemedText>
              <View style={styles.versionBadge}>
                <ThemedText style={styles.versionText}>
                  v{mostRecentVersion.version}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.recipeDescription}>
              {mostRecentVersion.description}
            </ThemedText>
            <View style={styles.recipeMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#8B7355" />
                <ThemedText style={styles.metaText}>
                  {formatTime(
                    mostRecentVersion.prepTime + mostRecentVersion.cookTime
                  )}
                </ThemedText>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={16} color="#8B7355" />
                <ThemedText style={styles.metaText}>
                  {mostRecentVersion.servings} servings
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color="#8B7355" />
              <ThemedText style={styles.sectionTitle}>Ingredients</ThemedText>
            </View>
            <View style={styles.ingredientsList}>
              {mostRecentVersion.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.ingredientBullet} />
                  <ThemedText style={styles.ingredientText}>
                    {ingredient}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="restaurant-outline" size={20} color="#8B7355" />
              <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
            </View>
            <View style={styles.instructionsList}>
              {mostRecentVersion.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <ThemedText style={styles.instructionNumberText}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.instructionText}>
                    {instruction}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* Original Prompt */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-outline" size={20} color="#8B7355" />
              <ThemedText style={styles.sectionTitle}>
                Original Prompt
              </ThemedText>
            </View>
            <View style={styles.promptCard}>
              <ThemedText style={styles.promptText}>
                &ldquo;{originalPrompt.message}&rdquo;
              </ThemedText>
            </View>
          </View>

          {/* Generate New Version */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="add-circle-outline" size={20} color="#8B7355" />
              <ThemedText style={styles.sectionTitle}>
                Generate New Version
              </ThemedText>
            </View>
            <View style={styles.generateCard}>
              <TextInput
                style={styles.messageInput}
                placeholder="Describe how you'd like to modify this recipe..."
                placeholderTextColor="#A69B8D"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  isLoading && styles.generateButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#F8F6F1" />
                ) : (
                  <Ionicons name="send" size={20} color="#F8F6F1" />
                )}
                <ThemedText style={styles.generateButtonText}>
                  {isLoading ? "Generating..." : "Generate New Version"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F6F1",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F6F1",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#5D4E37",
    flex: 1,
    textAlign: "center",
  },
  historyButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recipeInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#E8E0D0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5D4E37",
    flex: 1,
  },
  versionBadge: {
    backgroundColor: "#8B7355",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  versionText: {
    color: "#F8F6F1",
    fontSize: 12,
    fontWeight: "600",
  },
  recipeDescription: {
    fontSize: 16,
    color: "#8B7355",
    lineHeight: 22,
    marginBottom: 16,
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
    color: "#8B7355",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5D4E37",
    marginLeft: 8,
  },
  ingredientsList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E0D0",
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8B7355",
    marginTop: 8,
    marginRight: 12,
  },
  ingredientText: {
    fontSize: 16,
    color: "#5D4E37",
    flex: 1,
    lineHeight: 22,
  },
  instructionsList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E0D0",
  },
  instructionItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#8B7355",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  instructionNumberText: {
    color: "#F8F6F1",
    fontSize: 12,
    fontWeight: "600",
  },
  instructionText: {
    fontSize: 16,
    color: "#5D4E37",
    flex: 1,
    lineHeight: 22,
  },
  promptCard: {
    backgroundColor: "#F8F6F1",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E0D0",
  },
  promptText: {
    fontSize: 16,
    color: "#5D4E37",
    fontStyle: "italic",
    lineHeight: 22,
  },
  generateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E0D0",
  },
  messageInput: {
    height: 100,
    borderWidth: 2,
    borderColor: "#E8E0D0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#5D4E37",
    backgroundColor: "#F8F6F1",
    marginBottom: 16,
    textAlignVertical: "top",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B7355",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  generateButtonDisabled: {
    backgroundColor: "#A8A8A8",
    opacity: 0.6,
  },
  generateButtonText: {
    color: "#F8F6F1",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
