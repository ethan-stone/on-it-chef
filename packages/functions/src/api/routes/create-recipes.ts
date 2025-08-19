import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";
import { generateRecipe } from "../ai";
import { checkRateLimit } from "../rate-limit";

const route = createRoute({
  operationId: "createRecipe",
  method: "post" as const,
  path: "/v1/recipes.createRecipe",
  summary: "Create a new recipe",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            userGivenName: z.string().optional(),
            visibility: z.enum(["public", "private"]).default("private"),
            includeDietaryRestrictions: z.boolean().default(true),
            customDietaryRestrictions: z.string().optional(),
            message: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Recipe created",
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

  const canCreateRecipe =
    await root.services.userService.canCreateRecipeVersion(user.id);

  if (!canCreateRecipe.success) {
    throw new HTTPException({
      type: "FORBIDDEN",
      message: canCreateRecipe.message,
      code: canCreateRecipe.code,
    });
  }

  const {
    visibility,
    includeDietaryRestrictions,
    customDietaryRestrictions,
    message,
  } = c.req.valid("json");

  try {
    // Use custom dietary restrictions if provided, otherwise fall back to user's saved preferences
    const finalDietaryRestrictions =
      customDietaryRestrictions ||
      (includeDietaryRestrictions ? user.dietaryRestrictions : undefined);

    // Call the AI to generate the recipe
    const aiRecipe = await generateRecipe(message, finalDietaryRestrictions);

    const recipe = await root.services.recipesService.createRecipe({
      dietaryRestrictions: finalDietaryRestrictions,
      visibility: visibility,
      initialRecipeVersion: {
        userId: user.id,
        generatedName: aiRecipe.generatedName,
        version: 1,
        description: aiRecipe.description,
        prepTime: aiRecipe.prepTime,
        cookTime: aiRecipe.cookTime,
        servings: aiRecipe.servings,
        ingredients: aiRecipe.ingredients,
        instructions: aiRecipe.instructions,
        message: message,
        createdAt: new Date(),
      },
    });

    logger.info(`Created recipe ${recipe.id} for user ${user.id}`);

    logger.metric(`Created recipe ${recipe.id} for user ${user.id}`, {
      name: "recipe.version.created",
      userId: user.id,
      recipeId: recipe.id,
      recipeVersionId: recipe.recentVersions.sort(
        (a, b) => b.version - a.version
      )[0].id,
      timestamp: Date.now(),
    });

    return c.json(recipe, 200);
  } catch (error) {
    logger.error("Error creating recipe", { error });
    throw new HTTPException({
      type: "INTERNAL_SERVER_ERROR",
      message: "Failed to create recipe",
    });
  }
};

export const CreateRecipe = {
  route,
  handler,
};
