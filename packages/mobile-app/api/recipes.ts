import { useRouter } from "expo-router";
import { client } from "./client";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";

export function useListRecipes() {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  if (isLoaded && !userId) {
    replace("/");
  }

  const query = useInfiniteQuery({
    queryKey: ["recipes"],
    queryFn: async ({ pageParam = 1 }) => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.listRecipes"].$get(
        {
          query: {
            page: pageParam.toString(),
            limit: "20", // Smaller page size for better UX
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to list recipes");
      }

      const recipes = await response.json();

      return recipes;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If there are more recipes, return the next page number
      if (lastPage.hasMore) {
        return allPages.length + 1;
      }
      return undefined; // No more pages
    },
    initialPageParam: 1,
  });

  return query;
}

export function useCreateRecipe() {
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  const { isLoaded, userId, getToken } = useAuth();

  if (isLoaded && !userId) {
    replace("/");
  }

  const mutation = useMutation({
    mutationFn: async (data: {
      userGivenName?: string;
      visibility?: "public" | "private";
      dietaryRestrictions?: string;
      message: string;
    }) => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.createRecipe"].$post(
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
        throw new Error("Failed to create recipe");
      }

      const recipe = await response.json();

      return recipe;
    },
    onSuccess: () => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  return mutation;
}

export function useGenerateRecipeVersion() {
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  const { isLoaded, userId, getToken } = useAuth();

  if (isLoaded && !userId) {
    replace("/");
  }

  const mutation = useMutation({
    mutationFn: async (data: { recipeId: string; message: string }) => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1[
        "recipes.generateRecipeVersion"
      ].$post(
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
        throw new Error("Failed to generate recipe version");
      }

      const recipe = await response.json();

      return recipe;
    },
    onSuccess: () => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  return mutation;
}

export function useListRecipeVersions(recipeId: string) {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  if (isLoaded && !userId) {
    replace("/");
  }

  const query = useInfiniteQuery({
    queryKey: ["recipe-versions", recipeId],
    queryFn: async ({ pageParam = 1 }) => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.listRecipeVersions"].$get(
        {
          query: {
            recipeId,
            page: pageParam.toString(),
            limit: "10", // Smaller page size for versions
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to list recipe versions");
      }

      const versions = await response.json();

      return versions;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If there are more versions, return the next page number
      if (lastPage.hasMore) {
        return allPages.length + 1;
      }
      return undefined; // No more pages
    },
    initialPageParam: 1,
  });

  return query;
}
