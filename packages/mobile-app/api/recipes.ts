import { useRouter } from "expo-router";
import { client } from "./client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";

export function useListRecipes() {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  if (isLoaded && !userId) {
    replace("/");
  }

  const query = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1["recipes.listRecipes"].$get(
        {
          query: {
            page: "1",
            limit: "50",
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
  });

  return query;
}
