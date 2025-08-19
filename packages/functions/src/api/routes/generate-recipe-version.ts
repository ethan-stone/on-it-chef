import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";
import { generateRecipeVersion } from "../ai";
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

  const canCreateRecipeVersion =
    await root.services.userService.canCreateRecipeVersion(user.id);

  if (!canCreateRecipeVersion.success) {
    throw new HTTPException({
      type: "FORBIDDEN",
      message: canCreateRecipeVersion.message,
      code: canCreateRecipeVersion.code,
    });
  }

  const { recipeId, message } = c.req.valid("json");

  try {
    // Get the current recipe to verify ownership and get previous versions
    const currentRecipe = await root.services.recipesService.getRecipe(
      recipeId
    );

    if (!currentRecipe) {
      throw new HTTPException({
        type: "NOT_FOUND",
        message: "Recipe not found",
      });
    }

    // Verify the user owns this recipe
    if (currentRecipe.userId !== user.id) {
      throw new HTTPException({
        type: "FORBIDDEN",
        message: "You don't have permission to modify this recipe",
      });
    }

    // Call the AI to generate the new recipe version
    const aiRecipe = await generateRecipeVersion(
      message,
      currentRecipe.recentVersions,
      currentRecipe.dietaryRestrictions || undefined
    );

    // Create the new recipe version
    const updatedRecipe =
      await root.services.recipesService.createRecipeVersion(
        recipeId,
        user.id,
        {
          generatedName: aiRecipe.generatedName,
          description: aiRecipe.description,
          prepTime: aiRecipe.prepTime,
          cookTime: aiRecipe.cookTime,
          servings: aiRecipe.servings,
          ingredients: aiRecipe.ingredients,
          instructions: aiRecipe.instructions,
          message: message,
        },
        message
      );

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
  } catch (error) {
    logger.error("Error generating recipe version", { error });

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException({
      type: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate recipe version",
    });
  }
};

export const GenerateRecipeVersion = {
  route,
  handler,
};
