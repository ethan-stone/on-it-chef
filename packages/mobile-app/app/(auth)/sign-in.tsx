import { useSignIn, useSSO } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import * as Linking from "expo-linking";

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [code, setCode] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
    if (!isLoaded) return;
    if (!emailAddress) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        strategy: "email_code",
      });

      if (signInAttempt.status === "needs_first_factor") {
        setPendingVerification(true);
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        Alert.alert("Error", "Sign in failed. Please try again.");
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", "Sign in failed. Please check your email address.");
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
      const signInAttempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        Alert.alert("Error", "Verification failed. Please try again.");
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", "Verification failed. Please check your code.");
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignIn = async () => {
    try {
      const result = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: Linking.createURL("/"),
      });

      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        console.error(JSON.stringify(result, null, 2));
        Alert.alert("Error", "Sign in failed. Please try again.");
      }
    } catch (error) {
      console.error(JSON.stringify(error, null, 2));
      Alert.alert("Error", "Sign in failed. Please try again.");
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
                  {isLoading ? "Signing in..." : "Sign In"}
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
            <ThemedText style={styles.title}>Welcome Back</ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter your email to sign in
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
              onPress={onSignInPress}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? "Sending code..." : "Send Code"}
              </ThemedText>
            </TouchableOpacity>
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <ThemedText style={styles.orText}>Or</ThemedText>
              <View style={styles.orLine} />
            </View>
            <View style={styles.googleButtonContainer}>
              <GoogleSignInButton onPress={googleSignIn} />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Don&apos;t have an account?{" "}
            </ThemedText>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <ThemedText style={styles.linkText}>Sign up</ThemedText>
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
    width: "100%",
    justifyContent: "center",
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
  orContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  orText: {
    fontSize: 16,
    color: "#8B7355", // Medium brown text
    marginHorizontal: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#8B7355", // Medium brown text
  },
  googleButtonContainer: {
    marginTop: 16,
  },
});
