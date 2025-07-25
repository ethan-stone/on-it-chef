import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ToastProvider } from "@/components/ToastContext";
import "react-native-reanimated";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - data stays in cache for 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider tokenCache={tokenCache}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <ToastProvider>
            <Stack>
              <Stack.Screen
                name="(home)"
                options={{ headerShown: false, title: "Home" }}
              />
              <Stack.Screen
                name="(auth)"
                options={{ headerShown: false, title: "Auth" }}
              />
              <Stack.Screen
                name="+not-found"
                options={{ headerShown: false, title: "Not Found" }}
              />
            </Stack>
          </ToastProvider>
        </ThemeProvider>
      </ClerkProvider>
    </QueryClientProvider>
  );
}
