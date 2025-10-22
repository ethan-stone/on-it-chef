import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import {
  errorResponseSchemas,
  handleServiceResult,
  HTTPException,
} from "../errors";
import { checkRateLimit } from "../rate-limit";

const route = createRoute({
  operationId: "generateRecipeVersion",
  method: "post" as const,
  path: "/v1/recipes.generateRecipeVersion",
  summary: "Generate a new version of an existing recipe",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            recipeId: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Recipe version generated",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            userGivenName: z.string().nullish(),
            generatedName: z.string(),
            recentVersions: z.array(
              z.object({
                id: z.string(),
                recipeId: z.string(),
                userId: z.string(),
                generatedName: z.string(),
                version: z.number(),
                description: z.string(),
                prepTime: z.number(),
                cookTime: z.number(),
                servings: z.number(),
                ingredients: z.array(
                  z.object({
                    description: z.string(),
                    name: z.string(),
                    quantity: z.number(),
                    unit: z.string().nullish(),
                  })
                ),
                instructions: z.array(z.string()),
                createdAt: z.string().datetime(),
              })
            ),
            userId: z.string(),
            visibility: z.enum(["public", "private"]),
            dietaryRestrictions: z.string().nullish(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
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

  const { recipeId, message } = c.req.valid("json");

  const result = await root.services.recipesServiceV2.createRecipeVersion(
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
      prompt: message,
    }
  );

  const updatedRecipe = handleServiceResult(result, logger, {
    NO_ACCESS: {
      type: "FORBIDDEN",
      message:
        "You do not have access to generate a new version of this recipe.",
      code: "NO_ACCESS",
    },
    USER_NOT_FOUND: {
      type: "INTERNAL_SERVER_ERROR",
      message: "User is authenticated but does not exist?",
    },
    RECIPE_NOT_FOUND: {
      type: "NOT_FOUND",
      message: `Recipe with id ${recipeId} not found`,
    },
  });

  logger.info(
    `Generated new version for recipe ${recipeId} for user ${user.id}`
  );

  logger.metric(
    `Generated new version for recipe ${recipeId} for user ${user.id}`,
    {
      name: "recipe.version.created",
      userId: user.id,
      recipeId: recipeId,
      recipeVersionId: updatedRecipe.recentVersions.sort(
        (a, b) => b.version - a.version
      )[0].id,
      timestamp: Date.now(),
    }
  );

  return c.json(updatedRecipe, 200);
};

export const GenerateRecipeVersion = {
  route,
  handler,
};
