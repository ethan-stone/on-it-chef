import { Stack } from "expo-router/stack";
import { useGetLoggedInUser } from "@/api/users";
import { useGetAllActiveRemoteConfigs } from "@/api/remote-configs";
import { useEffect } from "react";
import Purchases from "react-native-purchases";
import { Platform } from "react-native";

export default function HomeLayout() {
  const { data: user } = useGetLoggedInUser();

  const { data: remoteConfigs } = useGetAllActiveRemoteConfigs();

  useEffect(() => {
    if (user && remoteConfigs?.get("purchasesEnabled")?.value.enabled) {
      if (Platform.OS === "ios") {
        Purchases.configure({
          apiKey: "appl_hSEYKzhwqMlOrFFlTwaIiRZrgKj",
          appUserID: user.id,
        });
      }
    }
  }, [user, remoteConfigs]);

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
