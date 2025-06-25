import * as React from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [code, setCode] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return;
    if (!emailAddress) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      await signUp.create({
        emailAddress,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle submission of verification form
  const onVerifyPress = async () => {
    if (!isLoaded) return;
    if (!code) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setIsLoading(true);

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace("/");
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
        Alert.alert("Error", "Verification failed. Please try again.");
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", "Verification failed. Please check your code.");
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ThemedView style={styles.container}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons
                name="checkmark-circle-outline"
                size={40}
                color="#8B7355"
              />
              <ThemedText style={styles.title}>Check Your Email</ThemedText>
              <ThemedText style={styles.subtitle}>
                We&apos;ve sent a 6-digit code to {emailAddress}
              </ThemedText>
            </View>

            {/* Verification Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="key-outline"
                  size={20}
                  color="#8B7355"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={code}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#A69B8D"
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={onVerifyPress}
                disabled={isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Didn&apos;t receive the code? Check your spam folder
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="restaurant" size={40} color="#8B7355" />
            <ThemedText style={styles.title}>Create Account</ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter your email to get started
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#8B7355"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Enter your email"
                placeholderTextColor="#A69B8D"
                onChangeText={setEmailAddress}
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={onSignUpPress}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? "Sending code..." : "Send Code"}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Already have an account?{" "}
            </ThemedText>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <ThemedText style={styles.linkText}>Sign in</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F6F1", // Book page color
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#5D4E37", // Dark brown text
    marginTop: 16,
    marginBottom: 8,
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#8B7355", // Medium brown text
    textAlign: "center",
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E0D5",
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#5D4E37", // Dark brown text
  },
  button: {
    backgroundColor: "#8B7355", // Medium brown
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#F8F6F1", // Light book page color
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
    color: "#8B7355", // Medium brown text
  },
  linkText: {
    fontSize: 16,
    color: "#8B7355", // Medium brown text
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
