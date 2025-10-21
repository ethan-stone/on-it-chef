import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";
import { checkRateLimit } from "../rate-limit";

const route = createRoute({
  operationId: "searchRecipes",
  method: "get" as const,
  path: "/v1/recipes.searchRecipes",
  summary: "Search recipes",
  request: {
    query: z.object({
      query: z.string().min(1, "Search query is required"),
    }),
  },
  responses: {
    200: {
      description: "Recipes found",
      content: {
        "application/json": {
          schema: z.object({
            recipes: z.array(
              z.object({
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
                userId: z.string(),
                visibility: z.enum(["public", "private"]),
                dietaryRestrictions: z.string().nullish(),
                createdAt: z.string().datetime(),
                updatedAt: z.string().datetime(),
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
      type: "UNAUTHORIZED",
      message: "User is not logged in.",
    });
  }

  await checkRateLimit(c, root.services.rateLimiter, {
    entityId: user.id,
    maxRequests: 1000,
  });

  const { query } = c.req.valid("query");

  const recipes = await root.services.recipesService.searchRecipes(
    user.id,
    query
  );

  return c.json(
    {
      recipes,
    },
    200
  );
};

export const SearchRecipes = {
  route,
  handler,
};
