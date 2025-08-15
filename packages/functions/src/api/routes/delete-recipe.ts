import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";
import { checkRateLimit } from "../rate-limit";

const route = createRoute({
  operationId: "deleteRecipe",
  method: "delete" as const,
  path: "/v1/recipes.deleteRecipe",
  summary: "Delete a recipe",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            recipeId: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Recipe deleted successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
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

  await checkRateLimit(c, root.services.rateLimiter, {
    entityId: user.id,
    maxRequests: 1000,
  });

  const { recipeId } = c.req.valid("json");

  try {
    // Verify the user owns this recipe
    const recipe = await root.services.recipesService.getRecipe(recipeId);

    if (!recipe) {
      throw new HTTPException({
        reason: "NOT_FOUND",
        message: "Recipe not found",
      });
    }

    if (recipe.userId !== user.id) {
      throw new HTTPException({
        reason: "FORBIDDEN",
        message: "You don't have permission to delete this recipe",
      });
    }

    // Delete the recipe and all related data
    await root.services.recipesService.deleteRecipe(recipeId);

    logger.info(`Deleted recipe ${recipeId} for user ${user.id}`);

    return c.json(
      {
        success: true,
        message: "Recipe deleted successfully",
      },
      200
    );
  } catch (error) {
    logger.error("Error deleting recipe", { error });

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException({
      reason: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete recipe",
    });
  }
};

export const DeleteRecipe = {
  route,
  handler,
};
