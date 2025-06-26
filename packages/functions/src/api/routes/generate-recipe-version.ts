import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";
import { generateRecipeVersion } from "../ai";

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
                ingredients: z.array(z.string()),
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
      reason: "UNAUTHORIZED",
      message: "User is not logged in.",
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
        reason: "NOT_FOUND",
        message: "Recipe not found",
      });
    }

    // Verify the user owns this recipe
    if (currentRecipe.userId !== user.id) {
      throw new HTTPException({
        reason: "FORBIDDEN",
        message: "You don't have permission to modify this recipe",
      });
    }

    // Get previous prompts for context
    const previousPrompts = await root.services.recipesService.getRecipePrompts(
      recipeId
    );

    // Call the AI to generate the new recipe version
    const aiRecipe = await generateRecipeVersion(
      message,
      currentRecipe.recentVersions,
      previousPrompts,
      currentRecipe.includeDietaryRestrictions
        ? user.dietaryRestrictions || undefined
        : undefined
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
        },
        message,
        currentRecipe.includeDietaryRestrictions
          ? user.dietaryRestrictions || undefined
          : undefined
      );

    logger.info(
      `Generated new version for recipe ${recipeId} for user ${user.id}`
    );

    return c.json(updatedRecipe, 200);
  } catch (error) {
    logger.error("Error generating recipe version", { error });

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException({
      reason: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate recipe version",
    });
  }
};

export const GenerateRecipeVersion = {
  route,
  handler,
};
