import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
  Modal,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  useGenerateRecipeVersion,
  useListRecipeVersions,
  useListRecipePrompts,
} from "@/api/recipes";
import { useGetLoggedInUser } from "@/api/users";
import { useToast } from "@/components/ToastContext";

export default function RecipeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newVersionMessage, setNewVersionMessage] = useState("");
  const [inputError, setInputError] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const newVersionInputRef = useRef<TextInput>(null);

  const {
    data: versionsData,
    isLoading: versionsLoading,
    error: versionsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListRecipeVersions(id as string);

  const { data: promptsData } = useListRecipePrompts(id as string);

  const generateVersionMutation = useGenerateRecipeVersion();
  const { data: user } = useGetLoggedInUser();

  // Flatten all pages of versions into a single array
  const allVersions = useMemo(
    () => versionsData?.pages.flatMap((page) => page.versions || []) || [],
    [versionsData?.pages]
  );
  const allPrompts = promptsData?.prompts || [];

  // Set the most recent version as default when data loads
  useEffect(() => {
    if (allVersions.length > 0) {
      // Always select the first version (most recent) when data changes
      setSelectedVersion(allVersions[0]);
    }
  }, [allVersions]);

  // Find the prompt for the selected version
  const selectedPrompt = allPrompts.find(
    (prompt: any) => prompt.generatedVersion === selectedVersion?.id
  );

  // Auto-focus the text input when modal opens
  useEffect(() => {
    if (modalVisible) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        newVersionInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalVisible]);

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

  const generateMarkdown = (version: any) => {
    if (!version) return "";

    const markdown = `# ${version.generatedName}

${version.description}

## Recipe Details
- **Prep Time:** ${formatTime(version.prepTime)}
- **Cook Time:** ${formatTime(version.cookTime)}
- **Total Time:** ${formatTime(version.prepTime + version.cookTime)}
- **Servings:** ${version.servings}

## Ingredients
${version.ingredients.map((ingredient: string) => `- ${ingredient}`).join("\n")}

## Instructions
${version.instructions
  .map((instruction: string, index: number) => `${index + 1}. ${instruction}`)
  .join("\n")}

---
*Generated on ${formatDate(version.createdAt)}*`;

    return markdown;
  };

  const handleCopyAsMarkdown = async () => {
    if (!selectedVersion) return;

    try {
      const markdown = generateMarkdown(selectedVersion);
      await Clipboard.setString(markdown);
      showToast("Recipe copied as markdown!", "success");
    } catch (error) {
      console.error("Failed to copy recipe:", error);
      showToast("Failed to copy recipe. Please try again.", "error");
    }
  };

  const handleGenerateVersion = async () => {
    setInputError("");
    if (!newVersionMessage.trim()) {
      setInputError("Please describe the changes you want to make.");
      return;
    }

    try {
      const updatedRecipe = await generateVersionMutation.mutateAsync({
        recipeId: id as string,
        message: newVersionMessage.trim(),
      });
      setModalVisible(false);
      setNewVersionMessage("");

      // Manually set the newest version from the response
      if (
        updatedRecipe.recentVersions &&
        updatedRecipe.recentVersions.length > 0
      ) {
        console.log("Setting new version:", updatedRecipe.recentVersions[0]);
        setSelectedVersion(updatedRecipe.recentVersions[0]);
      }

      showToast("New recipe version generated successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to generate new version. Please try again.", "error");
    }
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
        selectedVersion?.id === version.id && styles.selectedVersionItem,
      ]}
      onPress={() => setSelectedVersion(version)}
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

  if (versionsLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B7355" />
            <ThemedText style={styles.loadingText}>
              Loading recipe...
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (versionsError || allVersions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#8B7355" />
            <ThemedText style={styles.errorText}>
              Failed to load recipe. Please try again.
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

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
            {selectedVersion?.generatedName || "Recipe"}
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
              {versionsLoading ? (
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
            {selectedVersion && (
              <View style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <ThemedText style={styles.recipeTitle}>
                    {selectedVersion.generatedName}
                  </ThemedText>
                  <View style={styles.recipeHeaderActions}>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyAsMarkdown}
                    >
                      <Ionicons name="copy-outline" size={20} color="#8B7355" />
                    </TouchableOpacity>
                    <View style={styles.versionBadge}>
                      <ThemedText style={styles.versionText}>
                        v{selectedVersion.version}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <ThemedText style={styles.recipeDescription}>
                  {selectedVersion.description}
                </ThemedText>
                <View style={styles.recipeMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color="#8B7355" />
                    <ThemedText style={styles.metaText}>
                      {formatTime(
                        selectedVersion.prepTime + selectedVersion.cookTime
                      )}
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={16} color="#8B7355" />
                    <ThemedText style={styles.metaText}>
                      {selectedVersion.servings} servings
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}

            {/* Ingredients */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={20} color="#8B7355" />
                <ThemedText style={styles.sectionTitle}>Ingredients</ThemedText>
              </View>
              <View style={styles.ingredientsList}>
                {selectedVersion?.ingredients.map(
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
                {selectedVersion?.instructions.map(
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
            {selectedPrompt && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={20}
                    color="#8B7355"
                  />
                  <ThemedText style={styles.sectionTitle}>
                    Original Prompt
                  </ThemedText>
                </View>
                <View style={styles.promptCard}>
                  <ThemedText style={styles.promptText}>
                    &ldquo;{selectedPrompt.message}&rdquo;
                  </ThemedText>
                </View>
              </View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>

        {/* Generate New Version Button */}
        <View style={styles.generateButtonContainer}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              generateVersionMutation.isPending &&
                styles.generateButtonDisabled,
            ]}
            onPress={() => setModalVisible(true)}
            disabled={generateVersionMutation.isPending}
          >
            {generateVersionMutation.isPending ? (
              <ActivityIndicator size="small" color="#F8F6F1" />
            ) : (
              <Ionicons name="add-circle-outline" size={24} color="#F8F6F1" />
            )}
            <ThemedText style={styles.generateButtonText}>
              {generateVersionMutation.isPending
                ? "Generating..."
                : "Generate New Version"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Generate New Version Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
            setNewVersionMessage("");
          }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContainer}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <Ionicons name="create-outline" size={28} color="#8B7355" />
                    <ThemedText style={styles.modalTitle}>
                      Generate New Version
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
                      Describe the changes you&apos;d like to make to this
                      recipe
                    </ThemedText>

                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g., Make it spicier, add more vegetables, reduce cooking time..."
                      placeholderTextColor="#A69B8D"
                      value={newVersionMessage}
                      onChangeText={setNewVersionMessage}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      ref={newVersionInputRef}
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

                    {inputError ? (
                      <ThemedText style={styles.errorText}>
                        {inputError}
                      </ThemedText>
                    ) : null}
                  </View>

                  {/* Modal Actions */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setModalVisible(false);
                        setNewVersionMessage("");
                      }}
                    >
                      <ThemedText style={styles.cancelButtonText}>
                        Cancel
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.createButton]}
                      onPress={handleGenerateVersion}
                      disabled={generateVersionMutation.isPending}
                    >
                      {generateVersionMutation.isPending ? (
                        <ActivityIndicator size="small" color="#F8F6F1" />
                      ) : (
                        <View style={styles.buttonContent}>
                          <Ionicons name="create" size={20} color="#F8F6F1" />
                          <ThemedText style={styles.createButtonText}>
                            Generate
                          </ThemedText>
                        </View>
                      )}
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
  },
  contentContainer: {
    paddingBottom: 100, // Space for the floating button
  },
  recipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
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
  recipeHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyButton: {
    padding: 8,
  },
  versionBadge: {
    backgroundColor: "#8B7355",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 12,
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
    flex: 1,
    fontSize: 16,
    color: "#5D4E37",
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
    alignItems: "flex-start",
    marginBottom: 16,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#8B7355",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  instructionNumberText: {
    color: "#F8F6F1",
    fontSize: 12,
    fontWeight: "bold",
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: "#5D4E37",
    lineHeight: 22,
  },
  promptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E0D0",
  },
  promptText: {
    fontSize: 16,
    color: "#5D4E37",
    lineHeight: 22,
    fontStyle: "italic",
  },
  generateButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F8F6F1",
    borderTopWidth: 1,
    borderTopColor: "#E8E0D0",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8B7355",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    fontSize: 16,
    color: "#8B7355",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
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
    marginBottom: 12,
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
    minHeight: 48,
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
    flexShrink: 1,
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
  dietaryNote: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dietaryNoteText: {
    color: "#8B7355",
    fontSize: 14,
    marginLeft: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
