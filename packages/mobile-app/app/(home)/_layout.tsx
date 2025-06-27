import { Stack } from "expo-router/stack";
import { useGetLoggedInUser } from "@/api/users";

export default function HomeLayout() {
  // Prefetch user data to ensure dietary restrictions are available
  useGetLoggedInUser();

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
