import { HonoEnv } from "./app";
import { handleError } from "./errors";
import { handleZodError } from "./errors";
import { prettyJSON } from "hono/pretty-json";
import { OpenAPIHono } from "@hono/zod-openapi";
import { ClerkWebhook } from "./routes/clerk-webhook";
import { handle, streamHandle } from "hono/aws-lambda";
import { uid } from "./uid";
import { envSchema } from "./env";
import { ILogger, Logger } from "./logger";
import { clerkMiddleware } from "@hono/clerk-auth";
import { GetLoggedInUser } from "./routes/get-user";
import { UpdateUserSettings } from "./routes/update-user-settings";
import { init } from "./root";
import { Resource } from "sst";
import { ListRecipes } from "./routes/list-recipes";
import { CreateRecipe } from "./routes/create-recipes";
import { GenerateRecipeVersion } from "./routes/generate-recipe-version";
import { ListRecipeVersions } from "./routes/list-recipe-versions";
import { DeleteRecipe } from "./routes/delete-recipe";
import { ListRecipePrompts } from "./routes/list-recipe-prompts";
import { ForkRecipe } from "./routes/fork-recipe";

const app = new OpenAPIHono<HonoEnv>({
  defaultHook: handleZodError,
}).basePath("/api");

app.onError(handleError);
app.use(prettyJSON());

app.openAPIRegistry.registerComponent("securitySchemes", "oauth2", {
  type: "oauth2",
  description: "OAuth2 Client Credentials Flow",
  flows: {
    clientCredentials: {
      tokenUrl: "https://api.optra.pebble.sh/v1/oauth/token",
      scopes: {},
    },
  },
});

app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Optra Api",
    version: "1.0.0",
  },
  servers: [
    {
      url: "https://api.on-it-chef.com",
    },
  ],
  security: [
    {
      oauth2: [],
    },
  ],
});

app.use("*", async (c, next) => {
  const start = Date.now();

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.log(result.error);
    throw result.error;
  }

  const parsedEnv = result.data;

  try {
    const reqId = uid("req");

    c.set("reqId", reqId);

    let logger: ILogger;

    logger = new Logger({
      env: parsedEnv.ENVIRONMENT,
      dataset: "on-it-chef-logs",
      namespace: c.req.method + " " + c.req.path,
      service: "api",
      requestId: reqId,
    });

    c.set("logger", logger);

    const root = await init();

    c.set("root", root);

    logger.info("Request received");

    await next();

    c.res.headers.append("on-it-chef-request-id", reqId);
  } catch (error) {
    const logger = c.get("logger");

    logger.error("Error in request", {
      error: error,
    });

    throw error;
  } finally {
    const logger = c.get("logger");

    const duration = Date.now() - start;

    logger.info("Request finished", {
      duration,
    });
  }
});

app.use(
  "*",
  clerkMiddleware({
    secretKey: Resource.ClerkSecretKey.value,
    publishableKey: Resource.ClerkPublishableKey.value,
  })
);

app.use("*", async (c, next) => {
  const session = c.get("clerkAuth")();
  const root = c.get("root");

  if (!session || !session.userId) {
    c.set("user", null);
  } else {
    const user = await root.services.userService.getUser(session.userId);

    c.set("user", user ?? null);
  }

  await next();
});

const routes = app
  .openapi(ClerkWebhook.route, ClerkWebhook.handler)
  .openapi(GetLoggedInUser.route, GetLoggedInUser.handler)
  .openapi(ListRecipes.route, ListRecipes.handler)
  .openapi(CreateRecipe.route, CreateRecipe.handler)
  .openapi(GenerateRecipeVersion.route, GenerateRecipeVersion.handler)
  .openapi(ListRecipeVersions.route, ListRecipeVersions.handler)
  .openapi(DeleteRecipe.route, DeleteRecipe.handler)
  .openapi(ListRecipePrompts.route, ListRecipePrompts.handler)
  .openapi(UpdateUserSettings.route, UpdateUserSettings.handler)
  .openapi(ForkRecipe.route, ForkRecipe.handler);

export type Routes = typeof routes;

export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app);
