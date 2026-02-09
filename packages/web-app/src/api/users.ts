import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";
import { useAuth } from "@clerk/nextjs";

export function useGetLoggedInUser() {
  const { isLoaded, userId, getToken } = useAuth();

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

      return await response.json();
    },
    enabled: isLoaded && !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return query;
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

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

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  return mutation;
}
