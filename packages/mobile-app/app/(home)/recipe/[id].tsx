import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef } from "react";
import { useGenerateRecipeVersion, useListRecipeVersions } from "@/api/recipes";
import React from "react";

export default function RecipeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [newMessage, setNewMessage] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null); // Track selected version
  const generateVersionMutation = useGenerateRecipeVersion();
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch recipe versions
  const {
    data: versionsData,
    isLoading: isLoadingVersions,
    error: versionsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListRecipeVersions(id as string);

  // Flatten all pages of versions into a single array
  const allVersions =
    versionsData?.pages.flatMap((page) => page.versions || []) || [];

  // Set the selected version to the most recent when versions load
  React.useEffect(() => {
    if (allVersions.length > 0 && selectedVersion === null) {
      const mostRecentVersion = Math.max(...allVersions.map((v) => v.version));
      setSelectedVersion(mostRecentVersion);
    }
  }, [allVersions, selectedVersion]);

  // TODO: Replace with actual API call to get recipe by ID
  const isLoadingRecipe = false;
  const recipe = {
    id: id as string,
    userGivenName: "Spicy Chicken Curry",
    generatedName: "Spicy Chicken Curry with Coconut Milk",
    recentVersions: [
      {
        id: "version_1",
        version: 1,
        generatedName: "Spicy Chicken Curry with Coconut Milk",
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

  // Use the selected version from the API data, or fall back to mock data
  const currentVersion =
    allVersions.find((v) => v.version === selectedVersion) ||
    recipe.recentVersions[0];
  const originalPrompt = recipe.prompts[0];

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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      Alert.alert("Error", "Please enter a message");
      return;
    }

    try {
      await generateVersionMutation.mutateAsync({
        recipeId: id as string,
        message: newMessage.trim(),
      });
      setNewMessage("");
      Alert.alert("Success", "New recipe version generated!");
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to generate recipe version. Please try again."
      );
    }
  };

  const handleInputFocus = () => {
    // Scroll to show the input field without going too far
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 800, // Adjust this value based on content height
        animated: true,
      });
    }, 100);
  };

  const handleLoadMoreVersions = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Render version history item
  const renderVersionItem = ({ item: version }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.versionItem,
        selectedVersion === version.version && styles.selectedVersionItem,
      ]}
      onPress={() => setSelectedVersion(version.version)}
    >
      <View style={styles.versionItemHeader}>
        <ThemedText style={styles.versionNumber}>v{version.version}</ThemedText>
        <ThemedText style={styles.versionDate}>
          {formatDate(version.createdAt)}
        </ThemedText>
      </View>
      <ThemedText style={styles.versionName} numberOfLines={1}>
        {version.generatedName}
      </ThemedText>
      <ThemedText style={styles.versionDescription} numberOfLines={2}>
        {version.description}
      </ThemedText>
    </TouchableOpacity>
  );

  if (isLoadingRecipe) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B7355" />
          <ThemedText style={styles.loadingText}>Loading recipe...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
    >
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

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Version History */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={20} color="#8B7355" />
                <ThemedText style={styles.sectionTitle}>
                  Version History
                </ThemedText>
              </View>
              {isLoadingVersions ? (
                <View style={styles.loadingVersionsContainer}>
                  <ActivityIndicator size="small" color="#8B7355" />
                  <ThemedText style={styles.loadingVersionsText}>
                    Loading versions...
                  </ThemedText>
                </View>
              ) : versionsError ? (
                <View style={styles.errorVersionsContainer}>
                  <ThemedText style={styles.errorVersionsText}>
                    Failed to load versions
                  </ThemedText>
                </View>
              ) : (
                <FlatList
                  data={allVersions}
                  renderItem={renderVersionItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.versionsList}
                  onEndReached={handleLoadMoreVersions}
                  onEndReachedThreshold={0.1}
                  ListFooterComponent={
                    isFetchingNextPage ? (
                      <View style={styles.loadingMoreVersions}>
                        <ActivityIndicator size="small" color="#8B7355" />
                      </View>
                    ) : null
                  }
                />
              )}
            </View>

            {/* Current Version Info */}
            <View style={styles.recipeInfoCard}>
              <View style={styles.recipeHeader}>
                <ThemedText style={styles.recipeTitle}>
                  {currentVersion.generatedName}
                </ThemedText>
                <View style={styles.versionBadge}>
                  <ThemedText style={styles.versionText}>
                    v{currentVersion.version}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.recipeDescription}>
                {currentVersion.description}
              </ThemedText>
              <View style={styles.recipeMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#8B7355" />
                  <ThemedText style={styles.metaText}>
                    {formatTime(
                      currentVersion.prepTime + currentVersion.cookTime
                    )}
                  </ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={16} color="#8B7355" />
                  <ThemedText style={styles.metaText}>
                    {currentVersion.servings} servings
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
                {currentVersion.ingredients.map(
                  (ingredient: string, index: number) => (
                    <View key={index} style={styles.ingredientItem}>
                      <View style={styles.ingredientBullet} />
                      <ThemedText style={styles.ingredientText}>
                        {ingredient}
                      </ThemedText>
                    </View>
                  )
                )}
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant-outline" size={20} color="#8B7355" />
                <ThemedText style={styles.sectionTitle}>
                  Instructions
                </ThemedText>
              </View>
              <View style={styles.instructionsList}>
                {currentVersion.instructions.map(
                  (instruction: string, index: number) => (
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
                  )
                )}
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
                  onFocus={handleInputFocus}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.generateButton,
                    generateVersionMutation.isPending &&
                      styles.generateButtonDisabled,
                  ]}
                  onPress={handleSendMessage}
                  disabled={generateVersionMutation.isPending}
                >
                  {generateVersionMutation.isPending ? (
                    <ActivityIndicator size="small" color="#F8F6F1" />
                  ) : (
                    <Ionicons name="send" size={20} color="#F8F6F1" />
                  )}
                  <ThemedText style={styles.generateButtonText}>
                    {generateVersionMutation.isPending
                      ? "Generating..."
                      : "Generate New Version"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </ThemedView>
    </KeyboardAvoidingView>
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
  contentContainer: {
    paddingBottom: 100,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#8B7355",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  versionItem: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderWidth: 2,
    borderColor: "#E8E0D0",
    borderRadius: 12,
    marginRight: 12,
    width: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedVersionItem: {
    borderColor: "#8B7355",
    backgroundColor: "#F8F6F1",
  },
  versionItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  versionNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8B7355",
  },
  versionDate: {
    fontSize: 12,
    color: "#8B7355",
  },
  versionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5D4E37",
    marginBottom: 4,
  },
  versionDescription: {
    fontSize: 14,
    color: "#8B7355",
    lineHeight: 18,
  },
  versionsList: {
    paddingHorizontal: 20,
  },
  loadingVersionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingVersionsText: {
    color: "#8B7355",
    fontSize: 16,
    marginLeft: 8,
  },
  errorVersionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorVersionsText: {
    color: "#8B7355",
    fontSize: 16,
  },
  loadingMoreVersions: {
    padding: 12,
    alignItems: "center",
  },
});
