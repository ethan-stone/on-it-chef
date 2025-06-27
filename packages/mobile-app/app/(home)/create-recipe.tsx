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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRouter } from "expo-router";
import { useCreateRecipe } from "@/api/recipes";
import { useGetLoggedInUser } from "@/api/users";
import { useToast } from "@/components/ToastContext";

export default function CreateRecipe() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: user } = useGetLoggedInUser();
  const createRecipeMutation = useCreateRecipe();

  const [recipeMessage, setRecipeMessage] = useState("");
  const [inputError, setInputError] = useState("");
  const [includeDietaryRestrictions, setIncludeDietaryRestrictions] =
    useState(true);
  const [customDietaryRestrictions, setCustomDietaryRestrictions] =
    useState("");
  const [showCustomDietary, setShowCustomDietary] = useState(false);

  const recipeInputRef = useRef<TextInput>(null);
  const customDietaryRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle keyboard appearance
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        // Scroll to the custom dietary input if it's focused
        if (showCustomDietary) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
    };
  }, [showCustomDietary]);

  const handleCreateRecipe = async () => {
    setInputError("");
    if (!recipeMessage.trim()) {
      setInputError("Please describe the recipe you want to create.");
      return;
    }

    try {
      const newRecipe = await createRecipeMutation.mutateAsync({
        visibility: "private",
        message: recipeMessage.trim(),
        includeDietaryRestrictions: includeDietaryRestrictions,
        customDietaryRestrictions: showCustomDietary
          ? customDietaryRestrictions.trim()
          : undefined,
      });

      showToast("Recipe created successfully!", "success");

      // Navigate to the new recipe
      router.replace(`/recipe/${newRecipe.id}`);
    } catch (error) {
      console.error(error);
      showToast("Failed to create recipe. Please try again.", "error");
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#8B7355" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Create New Recipe</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
          >
            <ScrollView
              style={styles.content}
              contentContainerStyle={[styles.contentContainer]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ref={scrollViewRef}
            >
              {/* Recipe Description Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="restaurant" size={24} color="#8B7355" />
                  <ThemedText style={styles.sectionTitle}>
                    Recipe Description
                  </ThemedText>
                </View>
                <ThemedText style={styles.sectionDescription}>
                  Describe the recipe you&apos;d like to create. Be as detailed
                  as possible to get the best results.
                </ThemedText>
                <TextInput
                  style={styles.recipeInput}
                  placeholder="e.g., A spicy chicken curry with coconut milk, fresh herbs, and vegetables. I want it to be moderately spicy and serve 4 people."
                  placeholderTextColor="#A69B8D"
                  value={recipeMessage}
                  onChangeText={(text) => {
                    setRecipeMessage(text);
                    if (inputError) setInputError("");
                  }}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  ref={recipeInputRef}
                />
                {inputError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#D32F2F" />
                    <ThemedText style={styles.errorText}>
                      {inputError}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {/* Dietary Restrictions Section */}
              {user ? (
                user.dietaryRestrictions ? (
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
                      Choose how to handle dietary restrictions for this recipe.
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
                            showCustomDietary &&
                              styles.dietaryOptionTitleSelected,
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
                          onFocus={() => {
                            setTimeout(() => {
                              scrollViewRef.current?.scrollToEnd({
                                animated: true,
                              });
                            }, 100);
                          }}
                        />
                      </View>
                    )}
                  </View>
                ) : (
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
                      You haven&apos;t set any dietary restrictions yet. You can
                      add them in your settings.
                    </ThemedText>
                  </View>
                )
              ) : (
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
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#8B7355" />
                    <ThemedText style={styles.loadingText}>
                      Loading dietary preferences...
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                >
                  <ThemedText style={styles.cancelButtonText}>
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    createRecipeMutation.isPending &&
                      styles.createButtonDisabled,
                  ]}
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
                      : "Create Recipe"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
  recipeInput: {
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
  createButton: {
    flex: 2,
    backgroundColor: "#8B7355",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonDisabled: {
    backgroundColor: "#A8A8A8",
    opacity: 0.6,
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
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#8B7355",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});
