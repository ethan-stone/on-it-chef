import { Stack } from "expo-router/stack";
import { useGetLoggedInUser } from "@/api/users";
import { useEffect } from "react";
import Purchases from "react-native-purchases";
import { Platform } from "react-native";

export default function HomeLayout() {
  const { data: user } = useGetLoggedInUser();

  useEffect(() => {
    if (user) {
      if (Platform.OS === "ios") {
        Purchases.configure({
          apiKey: "appl_hSEYKzhwqMlOrFFlTwaIiRZrgKj",
          appUserID: user.id,
        });
      }
    }
  }, [user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-recipe" />
      <Stack.Screen name="fork-recipe" />
      <Stack.Screen name="recipe/[id]" />
    </Stack>
  );
}
