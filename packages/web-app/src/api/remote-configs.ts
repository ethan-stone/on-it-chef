import { useQuery } from "@tanstack/react-query";
import { client } from "./client";
import { useAuth } from "@clerk/nextjs";

export function useGetAllActiveRemoteConfigs() {
  const { isLoaded, userId, getToken } = useAuth();

  return useQuery({
    queryKey: ["remoteConfigs"],
    refetchInterval: 1000 * 60,
    queryFn: async () => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      const response = await client.api.v1[
        "remoteConfigs.getAllActiveRemoteConfigs"
      ].$get({}, { headers: { Authorization: `Bearer ${token}` } });

      if (response.status !== 200) {
        throw new Error("Failed to fetch remote configs");
      }

      const configsArray = await response.json();

      const configsMap = new Map(
        configsArray.map((config) => [config.name, config])
      );

      return configsMap;
    },
    enabled: isLoaded && !!userId,
  });
}
