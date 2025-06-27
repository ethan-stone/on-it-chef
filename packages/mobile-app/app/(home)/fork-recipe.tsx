import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForkRecipe, useListRecipeVersions } from "@/api/recipes";
import { useGetLoggedInUser } from "@/api/users";
import { useToast } from "@/components/ToastContext";

export default function ForkRecipe() {
  const router = useRouter();
  const { showToast } = useToast();
  const { id, versionId } = useLocalSearchParams();
  const { data: user } = useGetLoggedInUser();
  const forkRecipeMutation = useForkRecipe();
  const { data: versionsData } = useListRecipeVersions(id as string);

  const [forkPrompt, setForkPrompt] = useState("");
  const [inputError, setInputError] = useState("");
  const [includeDietaryRestrictions, setIncludeDietaryRestrictions] =
    useState(true);
  const [customDietaryRestrictions, setCustomDietaryRestrictions] =
    useState("");
  const [showCustomDietary, setShowCustomDietary] = useState(false);

  const forkInputRef = useRef<TextInput>(null);
  const customDietaryRef = useRef<TextInput>(null);

  // Get the source version
  const allVersions =
    versionsData?.pages.flatMap((page) => page.versions || []) || [];
  const sourceVersion =
    allVersions.find((v) => v.id === versionId) || allVersions[0];

  // Auto-focus the fork input when page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      forkInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleForkRecipe = async () => {
    setInputError("");
    if (!forkPrompt.trim()) {
      setInputError("Please describe the changes you want to make.");
      return;
    }

    if (!sourceVersion) {
      setInputError("Source recipe version not found.");
      return;
    }

    try {
      const forkedRecipe = await forkRecipeMutation.mutateAsync({
        sourceRecipeId: id as string,
        sourceVersionId: sourceVersion.id,
        userPrompt: forkPrompt.trim(),
        visibility: "private",
        includeDietaryRestrictions: includeDietaryRestrictions,
        customDietaryRestrictions: showCustomDietary
          ? customDietaryRestrictions.trim()
          : undefined,
      });

      showToast("Recipe forked successfully!", "success");

      // Navigate to the new forked recipe, replacing the current screen
      router.replace(`/recipe/${forkedRecipe.id}`);
    } catch (error) {
      console.error("Failed to fork recipe:", error);
      showToast("Failed to fork recipe. Please try again.", "error");
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!sourceVersion) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#8B7355" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Fork Recipe</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Source Recipe Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant" size={24} color="#8B7355" />
                <ThemedText style={styles.sectionTitle}>
                  Source Recipe
                </ThemedText>
              </View>
              <View style={styles.sourceRecipeCard}>
                <ThemedText style={styles.sourceRecipeTitle}>
                  {sourceVersion.generatedName}
                </ThemedText>
                <ThemedText style={styles.sourceRecipeDescription}>
                  {sourceVersion.description}
                </ThemedText>
                <View style={styles.sourceRecipeMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color="#8B7355" />
                    <ThemedText style={styles.metaText}>
                      {sourceVersion.prepTime + sourceVersion.cookTime} min
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={16} color="#8B7355" />
                    <ThemedText style={styles.metaText}>
                      {sourceVersion.servings} servings
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="git-branch-outline"
                      size={16}
                      color="#8B7355"
                    />
                    <ThemedText style={styles.metaText}>
                      v{sourceVersion.version}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>

            {/* Fork Description Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="create-outline" size={24} color="#8B7355" />
                <ThemedText style={styles.sectionTitle}>
                  Describe Changes
                </ThemedText>
              </View>
              <ThemedText style={styles.sectionDescription}>
                Describe the changes you&apos;d like to make to this recipe. Be
                specific about what you want to modify.
              </ThemedText>
              <TextInput
                style={styles.forkInput}
                placeholder="e.g., Make it vegetarian by replacing chicken with tofu, add more vegetables, reduce the spice level..."
                placeholderTextColor="#A69B8D"
                value={forkPrompt}
                onChangeText={(text) => {
                  setForkPrompt(text);
                  if (inputError) setInputError("");
                }}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                ref={forkInputRef}
              />
              {inputError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#D32F2F" />
                  <ThemedText style={styles.errorText}>{inputError}</ThemedText>
                </View>
              ) : null}
            </View>

            {/* Dietary Restrictions Section */}
            {user?.dietaryRestrictions && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="restaurant-outline"
                    size={24}
                    color="#8B7355"
                  />
                  <ThemedText style={styles.sectionTitle}>
                    Dietary Restrictions
                  </ThemedText>
                </View>
                <ThemedText style={styles.sectionDescription}>
                  Choose how to handle dietary restrictions for this forked
                  recipe.
                </ThemedText>

                {/* Default Restrictions Option */}
                <TouchableOpacity
                  style={[
                    styles.dietaryOption,
                    includeDietaryRestrictions &&
                      !showCustomDietary &&
                      styles.dietaryOptionSelected,
                  ]}
                  onPress={() => {
                    setIncludeDietaryRestrictions(true);
                    setShowCustomDietary(false);
                  }}
                >
                  <View style={styles.dietaryOptionHeader}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={
                        includeDietaryRestrictions && !showCustomDietary
                          ? "#8B7355"
                          : "#E8E0D0"
                      }
                    />
                    <ThemedText
                      style={[
                        styles.dietaryOptionTitle,
                        includeDietaryRestrictions &&
                          !showCustomDietary &&
                          styles.dietaryOptionTitleSelected,
                      ]}
                    >
                      Use my default restrictions
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.dietaryOptionDescription}>
                    {user.dietaryRestrictions}
                  </ThemedText>
                </TouchableOpacity>

                {/* No Restrictions Option */}
                <TouchableOpacity
                  style={[
                    styles.dietaryOption,
                    !includeDietaryRestrictions &&
                      !showCustomDietary &&
                      styles.dietaryOptionSelected,
                  ]}
                  onPress={() => {
                    setIncludeDietaryRestrictions(false);
                    setShowCustomDietary(false);
                  }}
                >
                  <View style={styles.dietaryOptionHeader}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={
                        !includeDietaryRestrictions && !showCustomDietary
                          ? "#8B7355"
                          : "#E8E0D0"
                      }
                    />
                    <ThemedText
                      style={[
                        styles.dietaryOptionTitle,
                        !includeDietaryRestrictions &&
                          !showCustomDietary &&
                          styles.dietaryOptionTitleSelected,
                      ]}
                    >
                      No dietary restrictions
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.dietaryOptionDescription}>
                    Create the recipe without any dietary restrictions
                  </ThemedText>
                </TouchableOpacity>

                {/* Custom Restrictions Option */}
                <TouchableOpacity
                  style={[
                    styles.dietaryOption,
                    showCustomDietary && styles.dietaryOptionSelected,
                  ]}
                  onPress={() => {
                    setShowCustomDietary(true);
                    setIncludeDietaryRestrictions(false);
                  }}
                >
                  <View style={styles.dietaryOptionHeader}>
                    <Ionicons
                      name="create"
                      size={20}
                      color={showCustomDietary ? "#8B7355" : "#E8E0D0"}
                    />
                    <ThemedText
                      style={[
                        styles.dietaryOptionTitle,
                        showCustomDietary && styles.dietaryOptionTitleSelected,
                      ]}
                    >
                      Custom restrictions
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.dietaryOptionDescription}>
                    Specify custom dietary restrictions for this recipe
                  </ThemedText>
                </TouchableOpacity>

                {/* Custom Restrictions Input */}
                {showCustomDietary && (
                  <View style={styles.customDietaryContainer}>
                    <TextInput
                      style={styles.customDietaryInput}
                      placeholder="e.g., vegan, nut-free, gluten-free, low-sodium"
                      placeholderTextColor="#A69B8D"
                      value={customDietaryRestrictions}
                      onChangeText={setCustomDietaryRestrictions}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      ref={customDietaryRef}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.forkButton,
                  forkRecipeMutation.isPending && styles.forkButtonDisabled,
                ]}
                onPress={handleForkRecipe}
                disabled={forkRecipeMutation.isPending}
              >
                {forkRecipeMutation.isPending ? (
                  <ActivityIndicator size="small" color="#F8F6F1" />
                ) : (
                  <Ionicons name="git-branch" size={20} color="#F8F6F1" />
                )}
                <ThemedText style={styles.forkButtonText}>
                  {forkRecipeMutation.isPending ? "Forking..." : "Fork Recipe"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
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
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#5D4E37",
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 16,
    color: "#8B7355",
    lineHeight: 22,
    marginBottom: 16,
  },
  sourceRecipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E0D0",
  },
  sourceRecipeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5D4E37",
    marginBottom: 8,
  },
  sourceRecipeDescription: {
    fontSize: 14,
    color: "#8B7355",
    lineHeight: 20,
    marginBottom: 12,
  },
  sourceRecipeMeta: {
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
  forkInput: {
    height: 120,
    borderWidth: 2,
    borderColor: "#E8E0D0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#5D4E37",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  dietaryOption: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E8E0D0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dietaryOptionSelected: {
    borderColor: "#8B7355",
    backgroundColor: "#F8F6F1",
  },
  dietaryOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dietaryOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5D4E37",
    marginLeft: 12,
  },
  dietaryOptionTitleSelected: {
    color: "#8B7355",
  },
  dietaryOptionDescription: {
    fontSize: 14,
    color: "#8B7355",
    marginLeft: 32,
  },
  customDietaryContainer: {
    marginTop: 12,
  },
  customDietaryInput: {
    height: 80,
    borderWidth: 2,
    borderColor: "#E8E0D0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#5D4E37",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F8F6F1",
    borderWidth: 2,
    borderColor: "#E8E0D0",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  forkButton: {
    flex: 2,
    backgroundColor: "#8B7355",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  forkButtonDisabled: {
    backgroundColor: "#A8A8A8",
    opacity: 0.6,
  },
  cancelButtonText: {
    color: "#8B7355",
    fontSize: 16,
    fontWeight: "600",
  },
  forkButtonText: {
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
});
