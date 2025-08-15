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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  useGenerateRecipeVersion,
  useGetRecipeDetails,
  RecipeVersion,
  useShareRecipe,
} from "@/api/recipes";
import { useToast } from "@/components/ToastContext";
import { useGetLoggedInUser } from "@/api/users";
import { useQueryClient } from "@tanstack/react-query";

export default function RecipeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedVersion, setSelectedVersion] = useState<RecipeVersion | null>(
    null
  );
  const { data: user } = useGetLoggedInUser();
  const [newVersionMessage, setNewVersionMessage] = useState("");
  const [inputError, setInputError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const newVersionInputRef = useRef<TextInput>(null);
  const shareRecipeMutation = useShareRecipe();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: versionsData,
    isLoading: versionsLoading,
    error: versionsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetRecipeDetails(id as string);

  // Get ownership information from the first page
  const isOwner = versionsData?.pages[0]?.isOwner ?? false;
  // const isShared = versionsData?.pages[0]?.isShared ?? false;

  const generateVersionMutation = useGenerateRecipeVersion();

  // Flatten all pages of versions into a single array
  const allVersions = useMemo(
    () =>
      versionsData?.pages.flatMap((page) => page.versions.versions || []) || [],
    [versionsData?.pages]
  );

  // Set the most recent version as default when data loads
  useEffect(() => {
    if (allVersions.length > 0) {
      // Always select the last version (most recent) when data changes
      setSelectedVersion(allVersions[0]);
    }
  }, [allVersions]);

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

  const generateMarkdown = (version: RecipeVersion) => {
    if (!version) return "";

    const markdown = `# ${version.generatedName}

${version.description}

## Recipe Details
- **Prep Time:** ${formatTime(version.prepTime)}
- **Cook Time:** ${formatTime(version.cookTime)}
- **Total Time:** ${formatTime(version.prepTime + version.cookTime)}
- **Servings:** ${version.servings}

## Ingredients
${version.ingredients
  .map((ingredient) => `- ${ingredient.description}`)
  .join("\n")}

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
      await Clipboard.setStringAsync(markdown);
      showToast("Recipe copied as markdown!", "success");
    } catch (error) {
      console.error("Failed to copy recipe:", error);
      showToast("Failed to copy recipe. Please try again.", "error");
    }
  };

  const handleForkRecipe = async () => {
    if (!selectedVersion) return;

    // Navigate to the fork recipe page
    router.push(`/fork-recipe?id=${id}&versionId=${selectedVersion.id}`);
  };

  const handleLoadMoreVersions = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleShareRecipe = async () => {
    setShareError("");
    if (!shareEmail.trim()) {
      setShareError("Please enter an email address.");
      return;
    }
    try {
      await shareRecipeMutation.mutateAsync({
        recipeId: id as string,
        shareWithEmail: shareEmail.trim(),
      });
      setShareModalVisible(false);
      setShareEmail("");
      showToast("Recipe shared successfully!", "success");
    } catch (error) {
      console.error(error);
      setShareError("Failed to share recipe. Please try again.");
      showToast("Failed to share recipe. Please try again.", "error");
    }
  };

  const handleGenerateVersion = async () => {
    setInputError("");
    if (!newVersionMessage.trim()) {
      setInputError("Please describe the changes you want to make.");
      return;
    }

    try {
      await generateVersionMutation.mutateAsync({
        recipeId: id as string,
        message: newVersionMessage.trim(),
      });
      setModalVisible(false);
      setNewVersionMessage("");

      // Invalidate the recipe details query to refetch with the new version
      await queryClient.invalidateQueries({
        queryKey: ["recipe-details", id],
      });

      showToast("New recipe version generated successfully!", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to generate new version. Please try again.", "error");
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
            <Ionicons name="arrow-back" size={22} color="#8B7355" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {selectedVersion?.generatedName || "Recipe"}
          </ThemedText>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setActionMenuVisible(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#8B7355" />
          </TouchableOpacity>
        </View>
        {/* Action Menu Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={actionMenuVisible}
          onRequestClose={() => setActionMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setActionMenuVisible(false)}>
            <View style={styles.actionMenuOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.actionMenuContainer}>
                  {/* Modal Header */}
                  <View style={styles.actionMenuHeader}>
                    <ThemedText style={styles.actionMenuTitle}>
                      Recipe Actions
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => setActionMenuVisible(false)}
                      style={styles.actionMenuCloseButton}
                    >
                      <Ionicons name="close" size={20} color="#8B7355" />
                    </TouchableOpacity>
                  </View>

                  {/* Action Items */}
                  <View style={styles.actionMenuItems}>
                    <TouchableOpacity
                      style={styles.actionMenuItem}
                      onPress={() => {
                        setActionMenuVisible(false);
                        handleCopyAsMarkdown();
                      }}
                    >
                      <View style={styles.actionMenuItemIcon}>
                        <Ionicons
                          name="copy-outline"
                          size={22}
                          color="#8B7355"
                        />
                      </View>
                      <View style={styles.actionMenuItemContent}>
                        <ThemedText style={styles.actionMenuText}>
                          Copy as Markdown
                        </ThemedText>
                        <ThemedText style={styles.actionMenuSubtext}>
                          Copy recipe to clipboard
                        </ThemedText>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#8B7355"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionMenuItem,
                        !isOwner && styles.actionMenuItemLast,
                      ]}
                      onPress={() => {
                        setActionMenuVisible(false);
                        handleForkRecipe();
                      }}
                    >
                      <View style={styles.actionMenuItemIcon}>
                        <Ionicons
                          name="git-branch-outline"
                          size={22}
                          color="#8B7355"
                        />
                      </View>
                      <View style={styles.actionMenuItemContent}>
                        <ThemedText style={styles.actionMenuText}>
                          Fork Recipe
                        </ThemedText>
                        <ThemedText style={styles.actionMenuSubtext}>
                          Create a variation
                        </ThemedText>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#8B7355"
                      />
                    </TouchableOpacity>

                    {/* Only show share option if user owns the recipe */}
                    {isOwner && (
                      <TouchableOpacity
                        style={[
                          styles.actionMenuItem,
                          styles.actionMenuItemLast,
                        ]}
                        onPress={() => {
                          setActionMenuVisible(false);
                          setShareModalVisible(true);
                        }}
                      >
                        <View style={styles.actionMenuItemIcon}>
                          <Ionicons
                            name="share-social-outline"
                            size={22}
                            color="#8B7355"
                          />
                        </View>
                        <View style={styles.actionMenuItemContent}>
                          <ThemedText style={styles.actionMenuText}>
                            Share Recipe
                          </ThemedText>
                          <ThemedText style={styles.actionMenuSubtext}>
                            Share with others
                          </ThemedText>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#8B7355"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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

            {/* Fork Info */}
            <View style={styles.section}>
              <View style={styles.forkInfoCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#8B7355"
                />
                <ThemedText style={styles.forkInfoText}>
                  Use the &ldquo;Fork&rdquo; button to create variations like
                  vegetarian, vegan, or other adaptations while keeping the
                  original intact.
                </ThemedText>
              </View>
            </View>

            {/* Ingredients */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={20} color="#8B7355" />
                <ThemedText style={styles.sectionTitle}>Ingredients</ThemedText>
              </View>
              <View style={styles.ingredientsList}>
                {selectedVersion?.ingredients.map(
                  (ingredient, index: number) => (
                    <View key={index} style={styles.ingredientItem}>
                      <View style={styles.ingredientBullet} />
                      <ThemedText style={styles.ingredientText}>
                        {ingredient.description}
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
            {selectedVersion && (
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
                    &ldquo;{selectedVersion.message}&rdquo;
                  </ThemedText>
                </View>
              </View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
        {/* Generate New Version Button */}
        {isOwner && (
          <View style={styles.generateButtonContainer}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                generateVersionMutation.isPending &&
                  styles.generateButtonDisabled,
              ]}
              onPress={() => isOwner && setModalVisible(true)}
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
        )}
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
        {/* Share Recipe Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={shareModalVisible}
          onRequestClose={() => {
            setShareModalVisible(false);
            setShareEmail("");
            setShareError("");
          }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContainer}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <Ionicons
                      name="share-social-outline"
                      size={28}
                      color="#8B7355"
                    />
                    <ThemedText style={styles.modalTitle}>
                      Share Recipe
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => {
                        setShareModalVisible(false);
                        setShareEmail("");
                        setShareError("");
                      }}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#8B7355" />
                    </TouchableOpacity>
                  </View>
                  {/* Modal Content */}
                  <View style={styles.modalContent}>
                    <ThemedText style={styles.modalSubtitle}>
                      Enter the email address of the user you want to share this
                      recipe with.
                    </ThemedText>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter email address"
                      placeholderTextColor="#A69B8D"
                      value={shareEmail}
                      onChangeText={setShareEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    {shareError ? (
                      <ThemedText style={styles.errorText}>
                        {shareError}
                      </ThemedText>
                    ) : null}
                  </View>
                  {/* Modal Actions */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setShareModalVisible(false);
                        setShareEmail("");
                        setShareError("");
                      }}
                    >
                      <ThemedText style={styles.cancelButtonText}>
                        Cancel
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.createButton]}
                      onPress={handleShareRecipe}
                      disabled={shareRecipeMutation.isPending}
                    >
                      {shareRecipeMutation.isPending ? (
                        <ActivityIndicator size="small" color="#F8F6F1" />
                      ) : (
                        <View style={styles.buttonContent}>
                          <Ionicons
                            name="share-social"
                            size={20}
                            color="#F8F6F1"
                          />
                          <ThemedText style={styles.createButtonText}>
                            Share
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D0",
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5D4E37",
    flex: 1,
    textAlign: "center",
  },
  historyButton: {
    padding: 6,
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
    fontSize: 22,
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
    padding: 4,
  },
  forkButton: {
    padding: 4,
    marginRight: 4,
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
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  generateButtonDisabled: {
    backgroundColor: "#A8A8A8",
    opacity: 0.6,
  },
  generateButtonText: {
    color: "#F8F6F1",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
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
    maxHeight: "70%",
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
    height: 100,
    borderWidth: 2,
    borderColor: "#E8E0D0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
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
  forkInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E0D0",
    flexDirection: "row",
    alignItems: "center",
  },
  forkInfoText: {
    color: "#8B7355",
    fontSize: 14,
    marginLeft: 8,
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
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionMenuContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "85%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  actionMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D0",
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5D4E37",
  },
  actionMenuCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F8F6F1",
  },
  actionMenuItems: {
    paddingVertical: 8,
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F6F1",
  },
  actionMenuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F6F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionMenuItemContent: {
    flex: 1,
  },
  actionMenuText: {
    color: "#5D4E37",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  actionMenuSubtext: {
    color: "#8B7355",
    fontSize: 14,
    fontWeight: "400",
  },
  actionMenuItemLast: {
    borderBottomWidth: 0,
  },
});
