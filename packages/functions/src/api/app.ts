import { LambdaEvent } from "hono/aws-lambda";
import { ILogger } from "./logger";
import { User, UserService } from "@on-it-chef/core/services/user";
import { ContextVariableMap } from "hono";

export type Root = {
  env: "development" | "production";
  secrets: {
    clerkWebhookSecret: string;
  };
  services: {
    userService: UserService;
  };
};

export type HonoEnv = {
  Bindings: {
    event: LambdaEvent;
  };
  Variables: {
    reqId: string;
    logger: ILogger;
    root: Root;
    user?: User | null;
  } & ContextVariableMap;
};
