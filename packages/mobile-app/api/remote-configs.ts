import { useQuery } from "@tanstack/react-query";
import { client } from "./client";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";

export function useGetAllActiveRemoteConfigs() {
  const { replace } = useRouter();

  const { isLoaded, userId, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded && !userId) {
      replace("/");
    }
  }, [isLoaded, userId, replace]);

  return useQuery({
    queryKey: ["remoteConfigs"],
    refetchInterval: 1000 * 60, // 1 minute
    queryFn: async () => {
      const startTime = Date.now();
      console.log(`🔄 [API] Starting remote configs fetch...`);

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

      const endTime = Date.now();
      console.log(
        `✅ [API] Remote configs fetched in ${endTime - startTime}ms`
      );

      const configsArray = await response.json();

      const configsMap = new Map(
        configsArray.map((config) => [config.name, config])
      );

      return configsMap;
    },
  });
}
