import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";

const route = createRoute({
  operationId: "listRecipeVersions",
  method: "get" as const,
  path: "/v1/recipes.listRecipeVersions",
  summary: "List recipe versions",
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
        .default("20"),
    }),
  },
  responses: {
    200: {
      description: "Recipe versions listed",
      content: {
        "application/json": {
          schema: z.object({
            hasMore: z.boolean(),
            versions: z.array(
              z.object({
                id: z.string(),
                recipeId: z.string(),
                userId: z.string(),
                generatedName: z.string(),
                version: z.number(),
                description: z.string(),
                prepTime: z.number(), // in minutes
                cookTime: z.number(), // in minutes
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

    const versions = await root.services.recipesService.listRecipeVersions(
      recipeId,
      page,
      limit
    );

    return c.json(
      {
        hasMore: versions.hasMore,
        versions: versions.versions,
      },
      200
    );
  } catch (error) {
    logger.error("Error listing recipe versions", { error });

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException({
      reason: "INTERNAL_SERVER_ERROR",
      message: "Failed to list recipe versions",
    });
  }
};

export const ListRecipeVersions = {
  route,
  handler,
};
