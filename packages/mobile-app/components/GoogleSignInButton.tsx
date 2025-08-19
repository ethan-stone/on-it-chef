import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  View,
  GestureResponderEvent,
} from "react-native";

interface GoogleButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  dark?: boolean; // dark theme option
}

const GoogleSignInButton: React.FC<GoogleButtonProps> = ({
  onPress,
  dark = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, dark ? styles.darkButton : styles.lightButton]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/g-logo.png")} // official "G" logo
          style={styles.logo}
        />
        <Text style={[styles.text, dark ? styles.darkText : styles.lightText]}>
          Sign in with Google
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    width: "100%",
  },
  lightButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADCE0",
  },
  darkButton: {
    backgroundColor: "#4285F4",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 18,
    height: 18,
    marginRight: 12,
    resizeMode: "contain",
  },
  text: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "Roboto-Medium",
  },
  lightText: {
    color: "#3C4043",
  },
  darkText: {
    color: "#FFFFFF",
  },
});

export default GoogleSignInButton;
