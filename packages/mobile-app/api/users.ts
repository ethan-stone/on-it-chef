import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export function useGetLoggedInUser() {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const query = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["users.getLoggedInUser"].$get(
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to get user");
      }

      const user = await response.json();

      return user;
    },
    enabled: isLoaded && !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes - user data stays fresh longer
    gcTime: 30 * 60 * 1000, // 30 minutes - user data stays in cache longer
    refetchOnMount: false, // Don't refetch if data is already in cache
    refetchOnWindowFocus: false,
  });

  return query;
}

export function useUpdateUserSettings() {
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const mutation = useMutation({
    mutationFn: async (data: { dietaryRestrictions?: string }) => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["users.updateUserSettings"].$put(
        {
          json: data,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to update user settings");
      }

      const user = await response.json();

      return user;
    },
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  return mutation;
}
