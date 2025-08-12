import { LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { ILogger } from "./logger";
import { User, UserService } from "@on-it-chef/core/services/users";
import { ContextVariableMap } from "hono";
import { RecipeService } from "@on-it-chef/core/services/recipes";
import {
  RemoteConfig,
  RemoteConfigService,
} from "@on-it-chef/core/services/remote-configs";
import { AdminApiKeyService } from "@on-it-chef/core/services/admin-api-keys";

export type Root = {
  env: "development" | "production";
  secrets: {
    clerkWebhookSecret: string;
  };
  services: {
    userService: UserService;
    recipesService: RecipeService;
    remoteConfigService: RemoteConfigService;
    adminApiKeyService: AdminApiKeyService;
  };
};

export type HonoEnv = {
  Bindings: {
    event: LambdaEvent;
    lambdaContext: LambdaContext;
  };
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
