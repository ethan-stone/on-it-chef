import { MongoClient } from "@on-it-chef/core/services/db";
import { EventService } from "@on-it-chef/core/services/events";
import { RemoteConfigService } from "@on-it-chef/core/services/remote-configs";
import { RevenueCatService } from "@on-it-chef/core/services/revenue-cat";
import {
  EnvSecretService,
  SecretService,
} from "@on-it-chef/core/services/secrets";
import { UserService } from "@on-it-chef/core/services/users";

export type Root = {
  env: "development" | "production";
  services: {
    userService: UserService;
    revenueCatService: RevenueCatService;
    eventService: EventService;
    secretService: SecretService;
  };
};

let secretService: SecretService | null = null;
let mongoClient: MongoClient | null = null;
let userService: UserService | null = null;
let revenueCatService: RevenueCatService | null = null;
let eventService: EventService | null = null;
let remoteConfigService: RemoteConfigService | null = null;

export async function init(): Promise<Root> {
  if (!secretService) {
    secretService = new EnvSecretService();
  }
  if (!mongoClient) {
    mongoClient = new MongoClient(await secretService.get("mongoUrl"));
    await mongoClient.connect();
  }
  if (!eventService) {
    eventService = new EventService(mongoClient);
  }
  if (!revenueCatService) {
    revenueCatService = new RevenueCatService({
      apiKey: await secretService.get("revenueCatRestApiKey"),
      projectId: await secretService.get("revenueCatProjectId"),
    });
  }
  if (!remoteConfigService) {
    remoteConfigService = new RemoteConfigService(mongoClient);
  }
  if (!userService) {
    userService = new UserService(mongoClient, remoteConfigService);
  }
  return {
    env: "development",
    services: {
      userService,
      revenueCatService,
      eventService,
      secretService,
    },
  };
}
