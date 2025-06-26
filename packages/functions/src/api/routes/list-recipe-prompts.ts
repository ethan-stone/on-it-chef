import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";

const route = createRoute({
  operationId: "listRecipePrompts",
  method: "get" as const,
  path: "/v1/recipes.listRecipePrompts",
  summary: "List recipe prompts",
  request: {
    query: z.object({
      recipeId: z.string(),
      page: z
        .string()
        .transform((val) => parseInt(val))
        .default("1"),
      limit: z
        .string()
        .transform((val) => parseInt(val))
        .default("50"),
    }),
  },
  responses: {
    200: {
      description: "Recipe prompts listed",
      content: {
        "application/json": {
          schema: z.object({
            hasMore: z.boolean(),
            prompts: z.array(
              z.object({
                id: z.string(),
                recipeId: z.string(),
                userId: z.string(),
                message: z.string(),
                generatedVersion: z.string(),
                createdAt: z.string().datetime(),
              })
            ),
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

    if (recipe.userId !== user.id) {
      throw new HTTPException({
        reason: "FORBIDDEN",
        message: "You don't have permission to view this recipe",
      });
    }

    const prompts = await root.services.recipesService.getRecipePrompts(
      recipeId
    );

    return c.json(
      {
        hasMore: false, // For now, return all prompts without pagination
        prompts: prompts,
      },
      200
    );
  } catch (error) {
    logger.error("Error listing recipe prompts", { error });

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException({
      reason: "INTERNAL_SERVER_ERROR",
      message: "Failed to list recipe prompts",
    });
  }
};

export const ListRecipePrompts = {
  route,
  handler,
};
