import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import {
  errorResponseSchemas,
  handleServiceResult,
  HTTPException,
} from "../errors";
import { HonoEnv } from "../app";
import { checkRateLimit } from "../rate-limit";

const route = createRoute({
  operationId: "shareRecipe",
  method: "post",
  path: "/v1/recipes.shareRecipe",
  summary: "Share a recipe with a user",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            recipeId: z.string(),
            shareWithEmail: z.string().toLowerCase().trim(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Recipe shared",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
    ...errorResponseSchemas,
  },
});

export const handler: RouteHandler<typeof route, HonoEnv> = async (c) => {
  const logger = c.get("logger");
  const user = c.get("user");
  const root = c.get("root");

  if (!user) {
    logger.info("User is not logged in.");

    throw new HTTPException({
      type: "UNAUTHORIZED",
      message: "User is not logged in.",
    });
  }

  await checkRateLimit(c, root.services.rateLimiter, {
    entityId: user.id,
    maxRequests: 1000,
  });

  const { recipeId, shareWithEmail } = c.req.valid("json");

  const recipe = await root.services.recipesService.getRecipe(recipeId);

  if (!recipe) {
    throw new HTTPException({
      type: "NOT_FOUND",
      message: "Recipe not found",
    });
  }

  const result = await root.services.recipesServiceV2.shareRecipe(
    {
      actor: {
        type: "user",
        id: user.id,
      },
      logger,
      scopes: [],
    },
    {
      recipeId: recipeId,
      sharedWithEmail: shareWithEmail,
    }
  );

  handleServiceResult(result, logger, {
    NO_ACCESS: {
      type: "FORBIDDEN",
      message: "You do not have access to share this recipe.",
      code: "NO_ACCESS",
    },
    USER_NOT_FOUND: {
      type: "INTERNAL_SERVER_ERROR",
      message: "User is authenticated but does not exist?",
    },
    RECIPE_NOT_FOUND: {
      type: "NOT_FOUND",
      message: "Recipe not found",
    },
  });

  return c.json(
    {
      success: true,
    },
    200
  );
};

export const ShareRecipe = {
  route,
  handler,
};
