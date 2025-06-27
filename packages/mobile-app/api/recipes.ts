import { useRouter } from "expo-router";
import { client } from "./client";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";

export type Recipe = NonNullable<
  NonNullable<
    NonNullable<ReturnType<typeof useListRecipes>>["data"]
  >["pages"][number]
>["recipes"][number];

export function useListRecipes() {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const query = useInfiniteQuery({
    queryKey: ["recipes"],
    queryFn: async ({ pageParam = 1 }) => {
      const startTime = Date.now();
      console.log(`🔄 [API] Starting recipes fetch (page ${pageParam})...`);

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

      const endTime = Date.now();
      console.log(
        `✅ [API] Recipes fetch (page ${pageParam}) completed in ${
          endTime - startTime
        }ms`
      );

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
    enabled: isLoaded && !!userId,
  });

  return query;
}

export function useCreateRecipe() {
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const mutation = useMutation({
    mutationFn: async (data: {
      userGivenName?: string;
      visibility?: "public" | "private";
      includeDietaryRestrictions?: boolean;
      customDietaryRestrictions?: string;
      message: string;
    }) => {
      const startTime = Date.now();
      console.log("🔄 [API] Starting recipe creation...");

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

      const endTime = Date.now();
      console.log(
        `✅ [API] Recipe creation completed in ${endTime - startTime}ms`
      );

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

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const mutation = useMutation({
    mutationFn: async (data: { recipeId: string; message: string }) => {
      const startTime = Date.now();
      console.log(
        `🔄 [API] Starting recipe version generation (recipe: ${data.recipeId})...`
      );

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

      const endTime = Date.now();
      console.log(
        `✅ [API] Recipe version generation (recipe: ${
          data.recipeId
        }) completed in ${endTime - startTime}ms`
      );

      return recipe;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      // Invalidate the specific recipe versions and prompts
      queryClient.invalidateQueries({
        queryKey: ["recipe-versions", variables.recipeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recipe-prompts", variables.recipeId],
      });
    },
  });

  return mutation;
}

export type RecipeVersion = NonNullable<
  NonNullable<
    NonNullable<ReturnType<typeof useListRecipeVersions>>["data"]
  >["pages"][number]
>["versions"][number];

export function useListRecipeVersions(recipeId: string) {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const query = useInfiniteQuery({
    queryKey: ["recipe-versions", recipeId],
    queryFn: async ({ pageParam = 1 }) => {
      const startTime = Date.now();
      console.log(
        `🔄 [API] Starting recipe versions fetch (recipe: ${recipeId}, page: ${pageParam})...`
      );

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

      const endTime = Date.now();
      console.log(
        `✅ [API] Recipe versions fetch (recipe: ${recipeId}, page: ${pageParam}) completed in ${
          endTime - startTime
        }ms`
      );

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
    enabled: isLoaded && !!userId,
  });

  return query;
}

export function useDeleteRecipe() {
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const mutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const startTime = Date.now();
      console.log(`🔄 [API] Starting recipe deletion (recipe: ${recipeId})...`);

      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.deleteRecipe"].$delete(
        {
          json: {
            recipeId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to delete recipe");
      }

      const endTime = Date.now();
      console.log(
        `✅ [API] Recipe deletion (recipe: ${recipeId}) completed in ${
          endTime - startTime
        }ms`
      );
    },
    onSuccess: () => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  return mutation;
}

export function useListRecipePrompts(recipeId: string) {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const query = useQuery({
    queryKey: ["recipe-prompts", recipeId],
    queryFn: async () => {
      const startTime = Date.now();
      console.log(
        `🔄 [API] Starting recipe prompts fetch (recipe: ${recipeId})...`
      );

      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.listRecipePrompts"].$get(
        {
          query: {
            recipeId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to list recipe prompts");
      }

      const prompts = await response.json();

      const endTime = Date.now();
      console.log(
        `✅ [API] Recipe prompts fetch (recipe: ${recipeId}) completed in ${
          endTime - startTime
        }ms`
      );

      return prompts;
    },
    enabled: isLoaded && !!userId && !!recipeId,
  });

  return query;
}

export function useForkRecipe() {
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const mutation = useMutation({
    mutationFn: async (data: {
      sourceRecipeId: string;
      sourceVersionId: string;
      userPrompt: string;
      userGivenName?: string;
      visibility?: "public" | "private";
      includeDietaryRestrictions?: boolean;
      customDietaryRestrictions?: string;
    }) => {
      const startTime = Date.now();
      console.log("🔄 [API] Starting recipe fork...");

      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.forkRecipe"].$post(
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
        throw new Error("Failed to fork recipe");
      }

      const recipe = await response.json();

      const endTime = Date.now();
      console.log(`✅ [API] Recipe fork completed in ${endTime - startTime}ms`);

      return recipe;
    },
    onSuccess: () => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  return mutation;
}

export function useGetRecipeDetails(recipeId: string) {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const query = useInfiniteQuery({
    queryKey: ["recipe-details", recipeId],
    queryFn: async ({ pageParam = 1 }) => {
      const startTime = Date.now();
      console.log(
        `🔄 [API] Starting recipe details fetch (recipe: ${recipeId}, page: ${pageParam})...`
      );

      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.getRecipeDetails"].$get(
        {
          query: {
            recipeId,
            page: pageParam.toString(),
            limit: "10",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to get recipe details");
      }

      const details = await response.json();

      const endTime = Date.now();
      console.log(
        `✅ [API] Recipe details fetch (recipe: ${recipeId}, page: ${pageParam}) completed in ${
          endTime - startTime
        }ms`
      );

      return details;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If there are more versions, return the next page number
      if (lastPage.versions.hasMore) {
        return allPages.length + 1;
      }
      return undefined; // No more pages
    },
    initialPageParam: 1,
    enabled: isLoaded && !!userId && !!recipeId,
  });

  return query;
}
