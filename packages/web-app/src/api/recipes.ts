import { client } from "./client";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

export type Recipe = NonNullable<
  NonNullable<
    NonNullable<ReturnType<typeof useListRecipes>>["data"]
  >["pages"][number]
>["recipes"][number] & {
  sharedBy?: string;
  sharedAt?: string;
};

export function useListRecipes() {
  const { isLoaded, userId, getToken } = useAuth();

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
        throw new Error("Failed to list recipes");
      }

      return await response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: isLoaded && !!userId,
  });

  return query;
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (data: {
      userGivenName?: string;
      visibility?: "public" | "private";
      includeDietaryRestrictions?: boolean;
      customDietaryRestrictions?: string;
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

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  return mutation;
}

export function useGenerateRecipeVersion() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

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

      return await response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
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
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (recipeId: string) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  return mutation;
}

export function useForkRecipe() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

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

      return await response.json();
    },
    onSuccess: () => {
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

  return await response.json();
}

export type RecipeDetails = Awaited<ReturnType<typeof fetchRecipeDetails>>;

export type RecipeVersion = RecipeDetails["versions"]["versions"][number];

export function useGetRecipeDetails(recipeId: string) {
  const { isLoaded, userId, getToken } = useAuth();

  const query = useInfiniteQuery({
    queryKey: ["recipe-details", recipeId],
    queryFn: async ({ pageParam = 1 }) => {
      return fetchRecipeDetails(recipeId, pageParam, getToken);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.versions.hasMore) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: isLoaded && !!userId && !!recipeId,
  });

  return query;
}

export function useSearchRecipes(query: string) {
  const { isLoaded, userId, getToken } = useAuth();

  const searchQuery = useInfiniteQuery({
    queryKey: ["search-recipes", query],
    queryFn: async () => {
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

      return await response.json();
    },
    getNextPageParam: () => {
      return undefined;
    },
    initialPageParam: 1,
    enabled: isLoaded && !!userId && query.trim().length > 0,
  });

  return searchQuery;
}

export function useListSharedRecipes() {
  const { isLoaded, userId, getToken } = useAuth();

  const query = useInfiniteQuery({
    queryKey: ["shared-recipes"],
    queryFn: async ({ pageParam = 1 }) => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.listSharedRecipes"].$get(
        {
          query: {
            page: pageParam.toString(),
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
        throw new Error("Failed to list shared recipes");
      }

      return await response.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: isLoaded && !!userId,
  });

  return query;
}

export function useShareRecipe() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (data: { recipeId: string; shareWithEmail: string }) => {
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

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-recipes"] });
    },
  });

  return mutation;
}
