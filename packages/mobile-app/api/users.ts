import { useQuery } from "@tanstack/react-query";
import { client } from "./client";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export function useGetLoggedInUser() {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  if (isLoaded && !userId) {
    replace("/");
  }

  const query = useQuery({
    queryKey: ["user", "loggedIn"],
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

      console.log(response);

      if (response.status !== 200) {
        return {
          user: null,
        };
      }

      const user = await response.json();

      return {
        user: user,
      };
    },
  });

  return query;
}
