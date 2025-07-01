import { useRouter } from "expo-router";
import { client } from "./client";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";

export type Recipe = NonNullable<
  NonNullable<
    NonNullable<ReturnType<typeof useListRecipes>>["data"]
  >["pages"][number]
>["recipes"][number] & {
  sharedBy?: string; // user id
  sharedAt?: string; // ISO string
};

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

export async function fetchRecipeDetails(
  recipeId: string,
  page: number,
  getToken: () => Promise<string | null>
) {
  const startTime = Date.now();
  console.log(
    `🔄 [API] Starting recipe details fetch (recipe: ${recipeId}, page: ${page})...`
  );

  const token = await getToken();

  if (!token) {
    throw new Error("No token");
  }

  const response = await client.api.v1["recipes.getRecipeDetails"].$get(
    {
      query: {
        recipeId,
        page: page.toString(),
        limit: "20",
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
    `✅ [API] Recipe details fetch (recipe: ${recipeId}, page: ${page}) completed in ${
      endTime - startTime
    }ms`
  );

  return details;
}

export type RecipeDetails = Awaited<ReturnType<typeof fetchRecipeDetails>>;

export type RecipeVersion = RecipeDetails["versions"]["versions"][number];

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
      return fetchRecipeDetails(recipeId, pageParam, getToken);
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

export function useSearchRecipes(query: string) {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const searchQuery = useInfiniteQuery({
    queryKey: ["search-recipes", query],
    queryFn: async ({ pageParam = 1 }) => {
      const startTime = Date.now();
      console.log(`🔄 [API] Starting recipe search for "${query}"...`);

      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.searchRecipes"].$get(
        {
          query: {
            query: query,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to search recipes");
      }

      const recipes = await response.json();

      const endTime = Date.now();
      console.log(
        `✅ [API] Recipe search for "${query}" completed in ${
          endTime - startTime
        }ms`
      );

      return recipes;
    },
    getNextPageParam: (lastPage, allPages) => {
      // For now, search returns all results in one page
      // If we implement pagination later, we can update this
      return undefined;
    },
    initialPageParam: 1,
    enabled: isLoaded && !!userId && query.trim().length > 0,
  });

  return searchQuery;
}

export function useListSharedRecipes() {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const query = useInfiniteQuery({
    queryKey: ["shared-recipes"],
    queryFn: async ({ pageParam = 1 }) => {
      const startTime = Date.now();
      console.log(
        `🔄 [API] Starting shared recipes fetch (page ${pageParam})...`
      );

      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.listSharedRecipes"].$get(
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
        throw new Error("Failed to list shared recipes");
      }

      const recipes = await response.json();

      const endTime = Date.now();
      console.log(
        `✅ [API] Shared recipes fetch (page ${pageParam}) completed in ${
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

export function useShareRecipe() {
  const { replace } = useRouter();
  const queryClient = useQueryClient();
  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  const mutation = useMutation({
    mutationFn: async (data: { recipeId: string; shareWithEmail: string }) => {
      const startTime = Date.now();
      console.log(
        `🔄 [API] Starting recipe share (recipe: ${data.recipeId})...`
      );

      const token = await getToken();
      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.shareRecipe"].$post(
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
        throw new Error("Failed to share recipe");
      }

      const result = await response.json();
      const endTime = Date.now();
      console.log(
        `✅ [API] Recipe share (recipe: ${data.recipeId}) completed in ${
          endTime - startTime
        }ms`
      );
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch shared recipes list
      queryClient.invalidateQueries({ queryKey: ["shared-recipes"] });
    },
  });

  return mutation;
}
