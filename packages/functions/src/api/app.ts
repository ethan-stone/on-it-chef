import { LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { ILogger } from "./logger";
import { User, UserService } from "@on-it-chef/core/services/users";
import { ContextVariableMap } from "hono";
import { RecipeService } from "@on-it-chef/core/services/recipes";

export type Root = {
  env: "development" | "production";
  secrets: {
    clerkWebhookSecret: string;
  };
  services: {
    userService: UserService;
    recipesService: RecipeService;
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
  } & ContextVariableMap;
};
