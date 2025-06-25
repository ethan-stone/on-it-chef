import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Link, Redirect } from "expo-router";
import { StyleSheet, View, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function Page() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <SignedIn>
          <Redirect href="/(home)/(tabs)/recipes" />
        </SignedIn>

        <SignedOut>
          {/* Auth landing page */}
          <View style={styles.authContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Ionicons name="restaurant" size={48} color="#8B7355" />
                <ThemedText style={styles.appTitle}>On-It Chef</ThemedText>
                <ThemedText style={styles.tagline}>
                  Your personal cooking companion
                </ThemedText>
              </View>
            </View>

            {/* Auth Buttons */}
            <View style={styles.authSection}>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity
                  style={[styles.authButton, styles.primaryButton]}
                >
                  <ThemedText style={styles.primaryButtonText}>
                    Create Account
                  </ThemedText>
                </TouchableOpacity>
              </Link>

              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity
                  style={[styles.authButton, styles.secondaryButton]}
                >
                  <ThemedText style={styles.secondaryButtonText}>
                    Sign In
                  </ThemedText>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <ThemedText style={styles.descriptionText}>
                Join thousands of home chefs discovering and sharing amazing
                recipes
              </ThemedText>
            </View>
          </View>
        </SignedOut>
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
  signedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    color: "#5D4E37", // Dark brown text
  },
  welcomeSubtitle: {
    textAlign: "center",
    fontSize: 16,
    opacity: 0.7,
    color: "#8B7355", // Medium brown text
  },
  authContainer: {
    flex: 1,
  },
  header: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 40, // Reduced since SafeAreaView handles the top
  },
  headerContent: {
    alignItems: "center",
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#5D4E37", // Dark brown text
    marginTop: 16,
    paddingTop: 16,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: "#8B7355", // Medium brown text
    textAlign: "center",
  },
  authSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  authButton: {
    borderRadius: 12,
    marginBottom: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#8B7355", // Medium brown
  },
  primaryButtonText: {
    color: "#F8F6F1", // Light book page color
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#8B7355", // Medium brown
  },
  secondaryButtonText: {
    color: "#8B7355", // Medium brown
    fontSize: 18,
    fontWeight: "600",
  },
  descriptionSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  descriptionText: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    color: "#8B7355", // Medium brown text
  },
});
