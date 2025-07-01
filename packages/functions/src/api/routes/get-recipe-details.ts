import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";

const route = createRoute({
  operationId: "getRecipeDetails",
  method: "get" as const,
  path: "/v1/recipes.getRecipeDetails",
  summary: "Get recipe details including versions and prompts",
  request: {
    query: z.object({
      recipeId: z.string(),
      page: z.string().optional().default("1"),
      limit: z.string().optional().default("10"),
    }),
  },
  responses: {
    200: {
      description: "Recipe details retrieved",
      content: {
        "application/json": {
          schema: z.object({
            versions: z.object({
              hasMore: z.boolean(),
              versions: z.array(
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
            }),
            prompts: z.array(
              z.object({
                id: z.string(),
                recipeId: z.string(),
                userId: z.string(),
                message: z.string(),
                generatedVersion: z.string().nullish(),
                createdAt: z.string().datetime(),
              })
            ),
            isOwner: z.boolean(),
            isShared: z.boolean(),
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
      reason: "UNAUTHORIZED",
      message: "User is not logged in.",
    });
  }

  const { recipeId, page, limit } = c.req.valid("query");

  try {
    // Verify the user owns this recipe
    const recipe = await root.services.recipesService.getRecipe(recipeId);

    if (!recipe) {
      throw new HTTPException({
        reason: "NOT_FOUND",
        message: "Recipe not found",
      });
    }

    const sharedRecipe = await root.services.recipesService.getSharedRecipe(
      recipeId,
      user.id
    );

    // Determine if user owns the recipe or if it's shared with them
    const isOwner = recipe.userId === user.id;
    const isShared = !isOwner && !!sharedRecipe;

    // If the recipe is not owned by the user, and it's not shared with the user, throw an error
    if (!isOwner && !isShared) {
      throw new HTTPException({
        reason: "FORBIDDEN",
        message: "You don't have permission to view this recipe",
      });
    }

    // Fetch both versions and prompts in parallel
    const [versionsResult, prompts] = await Promise.all([
      root.services.recipesService.listRecipeVersions(
        recipeId,
        parseInt(page),
        parseInt(limit)
      ),
      root.services.recipesService.getRecipePrompts(recipeId),
    ]);

    logger.info(`Retrieved recipe details for recipe ${recipeId}`);

    return c.json(
      {
        versions: versionsResult,
        prompts: prompts,
        isOwner,
        isShared,
      },
      200
    );
  } catch (error) {
    logger.error("Error getting recipe details", { error });

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException({
      reason: "INTERNAL_SERVER_ERROR",
      message: "Failed to get recipe details",
    });
  }
};

export const GetRecipeDetails = {
  route,
  handler,
};
