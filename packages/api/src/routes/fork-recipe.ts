import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import {
  errorResponseSchemas,
  handleServiceResult,
  HTTPException,
} from "../errors";
import { checkRateLimit } from "../rate-limit";

const route = createRoute({
  operationId: "forkRecipe",
  method: "post" as const,
  path: "/v1/recipes.forkRecipe",
  summary: "Fork a recipe version into a new recipe",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            sourceRecipeId: z.string(),
            sourceVersionId: z.string(),
            userPrompt: z.string(),
            visibility: z.enum(["public", "private"]).default("private"),
            includeDietaryRestrictions: z.boolean().default(true),
            customDietaryRestrictions: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Recipe forked successfully",
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

  const {
    sourceRecipeId,
    sourceVersionId,
    userPrompt,
    visibility,
    includeDietaryRestrictions,
    customDietaryRestrictions,
  } = c.req.valid("json");

  const result = await root.services.recipesServiceV2.forkRecipe(
    {
      actor: {
        type: "user",
        id: user.id,
      },
      logger,
      scopes: [],
    },
    {
      userId: user.id,
      sourceRecipeVersionId: sourceVersionId,
      prompt: userPrompt,
      visibility: visibility as "public" | "private",
      includeDietaryRestrictions: includeDietaryRestrictions,
      customDietaryRestrictions: customDietaryRestrictions,
    }
  );

  const forkedRecipe = handleServiceResult(result, logger, {
    NO_ACCESS: {
      type: "FORBIDDEN",
      message: "You do not have access to fork this recipe.",
      code: "NO_ACCESS",
    },
    USER_NOT_FOUND: {
      type: "INTERNAL_SERVER_ERROR",
      message: "User is authenticated but does not exist?",
    },
    SOURCE_RECIPE_VERSION_NOT_FOUND: {
      type: "NOT_FOUND",
      message: `Source recipe version with id ${sourceVersionId} not found`,
    },
    SOURCE_RECIPE_NOT_FOUND: {
      type: "NOT_FOUND",
      message: `Source recipe with id ${sourceRecipeId} not found`,
    },
  });

  logger.info(
    `Forked recipe ${sourceRecipeId} version ${sourceVersionId} to ${forkedRecipe.id} for user ${user.id}`
  );

  logger.metric(
    `Forked recipe ${sourceRecipeId} version ${sourceVersionId} to ${forkedRecipe.id} for user ${user.id}`,
    {
      name: "recipe.version.created",
      userId: user.id,
      recipeId: forkedRecipe.id,
      recipeVersionId: forkedRecipe.recentVersions.sort(
        (a, b) => b.version - a.version
      )[0].id,
      timestamp: Date.now(),
    }
  );

  return c.json(forkedRecipe, 200);
};

export const ForkRecipe = {
  route,
  handler,
};
