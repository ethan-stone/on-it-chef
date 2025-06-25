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
import { SignOutButton } from "@/components/SignOutButton";
import { useUser } from "@clerk/clerk-expo";

export default function Settings() {
  const { user } = useUser();

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: "person-outline",
          title: "Profile",
          subtitle: "Edit your profile information",
          action: "chevron-forward",
        },
        {
          icon: "mail-outline",
          title: "Email",
          subtitle: user?.emailAddresses[0]?.emailAddress || "No email set",
          action: "chevron-forward",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "notifications-outline",
          title: "Notifications",
          subtitle: "Manage notification preferences",
          action: "chevron-forward",
        },
        {
          icon: "moon-outline",
          title: "Dark Mode",
          subtitle: "Toggle dark mode",
          action: "chevron-forward",
        },
        {
          icon: "language-outline",
          title: "Language",
          subtitle: "English",
          action: "chevron-forward",
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
          icon: "document-text-outline",
          title: "Terms of Service",
          subtitle: "Read our terms of service",
          action: "chevron-forward",
        },
        {
          icon: "shield-checkmark-outline",
          title: "Privacy Policy",
          subtitle: "Read our privacy policy",
          action: "chevron-forward",
        },
        {
          icon: "information-circle-outline",
          title: "About",
          subtitle: "Version 1.0.0",
          action: "chevron-forward",
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

        {/* Settings Content */}
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
                  onPress={() => {
                    // Handle setting item press
                    console.log(`Pressed: ${item.title}`);
                  }}
                >
                  <View style={styles.settingIcon}>
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color="#8B7355"
                    />
                  </View>

                  <View style={styles.settingContent}>
                    <ThemedText style={styles.settingTitle}>
                      {item.title}
                    </ThemedText>
                    <ThemedText style={styles.settingSubtitle}>
                      {item.subtitle}
                    </ThemedText>
                  </View>

                  <View style={styles.settingAction}>
                    <Ionicons
                      name={item.action as any}
                      size={20}
                      color="#8B7355"
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
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
});
