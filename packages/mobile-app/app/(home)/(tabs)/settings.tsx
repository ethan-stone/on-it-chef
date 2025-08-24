import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SignOutButton } from "@/components/SignOutButton";
import { useGetLoggedInUser, useUpdateUserSettings } from "@/api/users";
import { useToast } from "@/components/ToastContext";
import React, { useState, useEffect, useRef } from "react";
import Purchases from "react-native-purchases";
import PurchasesPaywall from "react-native-purchases-ui";
import { ProgressBar } from "@/components/ui/ProgressBar";

type SettingItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  action: "chevron-forward" | "none" | "edit";
  customContent?: React.ReactNode;
  onPress?: () => void;
};

type SettingsSection = {
  title: string;
  items: SettingItem[];
};

export default function Settings() {
  const { data: user, isLoading } = useGetLoggedInUser();
  const { showToast } = useToast();
  const updateSettingsMutation = useUpdateUserSettings();
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    user?.dietaryRestrictions || ""
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<TextInput>(null);
  const [isPresentingPaywall, setIsPresentingPaywall] = useState(false);

  // Update local state when user data changes
  useEffect(() => {
    if (user?.dietaryRestrictions !== undefined) {
      setDietaryRestrictions(user.dietaryRestrictions || "");
    }
  }, [user?.dietaryRestrictions]);

  // Auto-focus the text input when modal opens
  useEffect(() => {
    if (modalVisible) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        editInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalVisible]);

  const handleSaveDietaryRestrictions = async () => {
    const newValue = editValue.trim() || undefined;

    // Optimistic update - immediately update local state and close modal
    setDietaryRestrictions(newValue || "");
    setModalVisible(false);

    try {
      await updateSettingsMutation.mutateAsync({
        dietaryRestrictions: newValue,
      });
      showToast("Dietary restrictions updated successfully!", "success");
    } catch (error) {
      console.error(error);
      // Revert optimistic update on error
      setDietaryRestrictions(user?.dietaryRestrictions || "");
      showToast(
        "Failed to update dietary restrictions. Please try again.",
        "error"
      );
    }
  };

  const handleEditDietaryRestrictions = () => {
    setEditValue(dietaryRestrictions);
    setModalVisible(true);
  };

  const handlePresentPaywall = async () => {
    setIsPresentingPaywall(true);
    try {
      const offerings = await Purchases.getOfferings();
      const customer = await Purchases.getCustomerInfo();
      console.log(customer);
      const defaultOffering = offerings.current;

      if (defaultOffering) {
        const result = await PurchasesPaywall.presentPaywall({
          offering: defaultOffering,
        });
        console.log(result);
      } else {
        showToast("No offerings available", "error");
      }
    } catch (error) {
      console.error("Error presenting paywall:", error);
      showToast("Failed to present paywall", "error");
    } finally {
      setIsPresentingPaywall(false);
    }
  };

  const getDietaryRestrictionsDisplay = () => {
    if (!user?.dietaryRestrictions || user.dietaryRestrictions.trim() === "") {
      return "No dietary restrictions set";
    }
    return user.dietaryRestrictions;
  };

  const settingsSections: SettingsSection[] = [
    {
      title: "Account",
      items: [
        {
          icon: "mail-outline",
          title: "Email",
          subtitle: user?.email || "No email set",
          action: "none",
        },
        {
          icon: "stats-chart-outline",
          title: "Recipe Versions Limit",
          subtitle: `You have ${
            (user?.recipeVersionsLimit || 0) -
            (user?.remainingRecipeVersions || 0)
          } recipe versions left`,
          action: "none",
          customContent: (
            <ProgressBar
              barColor="#5D4E37"
              used={user?.remainingRecipeVersions || 0}
              limit={user?.recipeVersionsLimit || 0}
            />
          ),
        },
      ],
    },

    {
      title: "Preferences",
      items: [
        {
          icon: "restaurant-outline",
          title: "Dietary Restrictions",
          subtitle: getDietaryRestrictionsDisplay(),
          action: "edit",
          onPress: handleEditDietaryRestrictions,
        },
      ],
    },
    {
      title: "App",
      items: [
        {
          icon: "help-circle-outline",
          title: "Help & Support",
          subtitle: "Get help and contact support",
          action: "chevron-forward",
        },
        {
          icon: "information-circle-outline",
          title: "About",
          subtitle: "Version 1.0.0",
          action: "chevron-forward",
        },
        {
          icon: "card-outline",
          title: "Test Paywall",
          subtitle: isPresentingPaywall
            ? "Presenting paywall..."
            : "Present RevenueCat paywall",
          action: "none",
          onPress: handlePresentPaywall,
          customContent: isPresentingPaywall ? (
            <ActivityIndicator
              size="small"
              color="#8B7355"
              style={{ marginLeft: 8 }}
            />
          ) : undefined,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="settings" size={32} color="#8B7355" />
            <ThemedText style={styles.headerTitle}>Settings</ThemedText>
          </View>
          <SignOutButton />
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B7355" />
            <ThemedText style={styles.loadingText}>
              Loading settings...
            </ThemedText>
          </View>
        ) : (
          /* Settings Content */
          <ScrollView
            style={styles.settingsList}
            showsVerticalScrollIndicator={false}
          >
            {settingsSections.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.section}>
                <ThemedText style={styles.sectionTitle}>
                  {section.title}
                </ThemedText>

                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={styles.settingItem}
                    onPress={item.onPress}
                    disabled={!item.onPress || isPresentingPaywall}
                  >
                    <View style={styles.settingIcon}>
                      <Ionicons name={item.icon} size={24} color="#8B7355" />
                    </View>

                    <View style={styles.settingContent}>
                      <ThemedText style={styles.settingTitle}>
                        {item.title}
                      </ThemedText>
                      <ThemedText style={styles.settingSubtitle}>
                        {item.subtitle}
                      </ThemedText>
                      {item.customContent && item.customContent}
                    </View>

                    {item.action === "edit" && (
                      <View style={styles.settingAction}>
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color="#8B7355"
                        />
                      </View>
                    )}
                    {item.action === "chevron-forward" && (
                      <View style={styles.settingAction}>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color="#8B7355"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </ThemedView>

      {/* Modal for editing dietary restrictions */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={() => {
            setModalVisible(false);
          }}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>
                Edit Dietary Restrictions
              </ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Vegetarian, Gluten-free, No dairy..."
                placeholderTextColor="#A69B8D"
                value={editValue}
                onChangeText={setEditValue}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                ref={editInputRef}
              />
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveDietaryRestrictions}
              >
                <ThemedText style={styles.modalSaveButtonText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
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
  settingsList: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5D4E37", // Dark brown text
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8E0D0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F6F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5D4E37", // Dark brown text
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#8B7355", // Medium brown text
  },
  settingAction: {
    marginLeft: 8,
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
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 160,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    width: "100%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5D4E37",
    marginBottom: 16,
  },
  modalInput: {
    height: 100,
    borderWidth: 1,
    borderColor: "#E8E0D0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#5D4E37",
    backgroundColor: "#F8F6F1",
    marginBottom: 16,
    textAlignVertical: "top",
  },
  modalSaveButton: {
    backgroundColor: "#8B7355",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8F6F1",
  },
});
