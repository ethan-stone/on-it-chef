import { ILogger } from "./logger";
import { User, UserService } from "@on-it-chef/core/services/users";
import { ContextVariableMap } from "hono";
import { RecipeService } from "@on-it-chef/core/services/recipes";
import {
  RemoteConfig,
  RemoteConfigService,
} from "@on-it-chef/core/services/remote-configs";
import { AdminApiKeyService } from "@on-it-chef/core/services/admin-api-keys";
import { RateLimiter } from "@on-it-chef/core/services/rate-limiter";
import { AiService } from "@on-it-chef/core/services/ai";
import { EventService } from "@on-it-chef/core/services/events";
import { RevenueCatService } from "@on-it-chef/core/services/revenue-cat";
import { SecretService } from "@on-it-chef/core/services/secrets";
import { HttpBindings } from "@hono/node-server";

export type Root = {
  env: "development" | "production";
  secrets: {
    clerkWebhookSecret: string;
    revenueCatWebhookAuthHeader: string;
  };
  services: {
    userService: UserService;
    recipesService: RecipeService;
    remoteConfigService: RemoteConfigService;
    adminApiKeyService: AdminApiKeyService;
    rateLimiter: RateLimiter;
    aiService: AiService;
    eventService: EventService;
    revenueCatService: RevenueCatService;
    secretService: SecretService;
  };
};

export type HonoEnv = {
  Bindings: HttpBindings;
  Variables: {
    reqId: string;
    logger: ILogger;
    root: Root;
    user?: User | null;
    adminApiKey: {
      id: string;
      name: string;
      status: "active" | "inactive";
    } | null;
    remoteConfigs: Map<string, RemoteConfig>;
  } & ContextVariableMap;
};
