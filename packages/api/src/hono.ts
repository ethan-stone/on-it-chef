import { HonoEnv } from "./app";
import { handleError } from "./errors";
import { handleZodError } from "./errors";
import { prettyJSON } from "hono/pretty-json";
import { OpenAPIHono } from "@hono/zod-openapi";
import { ClerkWebhook } from "./routes/clerk/clerk-webhook";
import { uid } from "./uid";
import { envSchema } from "./env";
import { ILogger, Logger } from "./logger";
import { clerkMiddleware } from "@hono/clerk-auth";
import { GetLoggedInUser } from "./routes/get-user";
import { UpdateUserSettings } from "./routes/update-user-settings";
import { init } from "./root";
import { ListRecipes } from "./routes/list-recipes";
import { CreateRecipe } from "./routes/create-recipes";
import { GenerateRecipeVersion } from "./routes/generate-recipe-version";
import { ListRecipeVersions } from "./routes/list-recipe-versions";
import { DeleteRecipe } from "./routes/delete-recipe";
import { ForkRecipe } from "./routes/fork-recipe";
import { GetRecipeDetails } from "./routes/get-recipe-details";
import { SearchRecipes } from "./routes/search-recipe";
import { ShareRecipe } from "./routes/share-recipe";
import { ListSharedRecipes } from "./routes/list-shared-recipes";
import { GetAllActiveRemoteConfigs } from "./routes/get-all-active-remote-configs";
import { CreateRemoteConfig } from "./routes/admin/create-remote-config";
import { RevenueCatWebhook } from "./routes/revenue-cat/revenue-cat-webhook";
import { Healthcheck } from "./routes/healthcheck";
import { serve } from "@hono/node-server";

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
      httpStatusCode: c.res.status,
    });
  }
});

app.use("*", async (c, next) => {
  const root = c.get("root");
  const secretService = root.services.secretService;
  const secretKey = await secretService.get("CLERK_SECRET_KEY");
  const publishableKey = await secretService.get("CLERK_PUBLISHABLE_KEY");

  if (c.req.path === "/api/healthcheck") {
    return next();
  }

  const middlewareFn = clerkMiddleware({
    secretKey: secretKey,
    publishableKey: publishableKey,
  });

  return middlewareFn(c, next);
});

app.use("*", async (c, next) => {
  if (c.req.path === "/api/healthcheck") {
    return next();
  }

  const session = c.get("clerkAuth")();
  const root = c.get("root");

  if (!session || !session.userId) {
    c.set("user", null);
  } else {
    const user = await root.services.userService.getUser(session.userId);

    if (user) {
      await root.services.userService.updateLastActiveAt(session.userId);
    }

    c.set("user", user ?? null);
  }

  await next();
});

app.use("*", async (c, next) => {
  const root = c.get("root");
  const adminApiKey = c.req.header("x-on-it-chef-admin-api-key");

  if (adminApiKey) {
    const adminApiKeyDoc =
      await root.services.adminApiKeyService.getAdminApiKey(adminApiKey);

    c.set(
      "adminApiKey",
      adminApiKeyDoc
        ? {
            id: adminApiKeyDoc.id,
            name: adminApiKeyDoc.name,
            status: adminApiKeyDoc.status,
          }
        : null
    );
  }

  await next();
});

const REMOTE_CONFIGS_CACHE_TTL = 1000 * 60; // 1 minute
let LAST_REMOTE_CONFIGS_CACHE_UPDATE = 0;

app.use("*", async (c, next) => {
  const root = c.get("root");

  const now = Date.now();

  // If the cache is stale, update it
  // Since we initialize the LAST_REMOTE_CONFIGS_CACHE_UPDATE to 0, it will always be stale on first request
  // and we at least have an empty map.
  if (now - LAST_REMOTE_CONFIGS_CACHE_UPDATE > REMOTE_CONFIGS_CACHE_TTL) {
    const remoteConfigs =
      await root.services.remoteConfigService.getAllActiveRemoteConfigs();

    c.set("remoteConfigs", new Map(remoteConfigs.map((rc) => [rc.name, rc])));

    LAST_REMOTE_CONFIGS_CACHE_UPDATE = now;
  }

  await next();
});

const routes = app
  .openapi(ClerkWebhook.route, ClerkWebhook.handler)
  .openapi(RevenueCatWebhook.route, RevenueCatWebhook.handler)
  .openapi(GetLoggedInUser.route, GetLoggedInUser.handler)
  .openapi(ListRecipes.route, ListRecipes.handler)
  .openapi(CreateRecipe.route, CreateRecipe.handler)
  .openapi(GenerateRecipeVersion.route, GenerateRecipeVersion.handler)
  .openapi(ListRecipeVersions.route, ListRecipeVersions.handler)
  .openapi(DeleteRecipe.route, DeleteRecipe.handler)
  .openapi(UpdateUserSettings.route, UpdateUserSettings.handler)
  .openapi(ForkRecipe.route, ForkRecipe.handler)
  .openapi(GetRecipeDetails.route, GetRecipeDetails.handler)
  .openapi(SearchRecipes.route, SearchRecipes.handler)
  .openapi(ShareRecipe.route, ShareRecipe.handler)
  .openapi(ListSharedRecipes.route, ListSharedRecipes.handler)
  .openapi(GetAllActiveRemoteConfigs.route, GetAllActiveRemoteConfigs.handler)
  .openapi(CreateRemoteConfig.route, CreateRemoteConfig.handler)
  .openapi(Healthcheck.route, Healthcheck.handler);

export type Routes = typeof routes;

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const host = process.env.HOST ? process.env.HOST : "0.0.0.0";

console.log(`Starting server on ${host}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});
