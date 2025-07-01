import { useClerk } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { Text, TouchableOpacity } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

export const SignOutButton = () => {
  // Use `useClerk()` to access the `signOut()` function
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    try {
      console.log("Signing out");

      // Clear all React Query cache before signing out
      console.log("Clearing React Query cache...");
      queryClient.clear();

      await signOut();
      // Redirect to your desired page
      router.replace("/");
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2));
    }
  };
  return (
    <TouchableOpacity onPress={handleSignOut}>
      <Text>Sign out</Text>
    </TouchableOpacity>
  );
};
