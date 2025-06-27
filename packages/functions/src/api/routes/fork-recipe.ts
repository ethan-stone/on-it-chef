import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";
import { generateForkedRecipe } from "../ai";

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
            userGivenName: z.string().optional(),
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

  const {
    sourceRecipeId,
    sourceVersionId,
    userPrompt,
    userGivenName,
    visibility,
    includeDietaryRestrictions,
    customDietaryRestrictions,
  } = c.req.valid("json");

  try {
    // Get the source recipe to verify it exists and get the version
    const sourceRecipe = await root.services.recipesService.getRecipe(
      sourceRecipeId
    );

    if (!sourceRecipe) {
      throw new HTTPException({
        reason: "NOT_FOUND",
        message: "Source recipe not found",
      });
    }

    if (sourceRecipe.userId !== user.id) {
      throw new HTTPException({
        reason: "FORBIDDEN",
        message: "You cannot fork your own recipe",
      });
    }

    const sourceVersion = sourceRecipe.recentVersions.find(
      (v) => v.id === sourceVersionId
    );

    if (!sourceVersion) {
      throw new HTTPException({
        reason: "NOT_FOUND",
        message: "Source recipe version not found",
      });
    }

    // Use user's dietary restrictions if includeDietaryRestrictions is true
    const finalDietaryRestrictions = includeDietaryRestrictions
      ? user.dietaryRestrictions || undefined
      : undefined;

    // Generate the forked recipe using AI
    const aiRecipe = await generateForkedRecipe(
      userPrompt,
      sourceVersion,
      finalDietaryRestrictions
    );

    const forkedRecipe = await root.services.recipesService.forkRecipe(
      sourceRecipeId,
      sourceVersionId,
      user.id,
      userPrompt,
      {
        generatedName: aiRecipe.generatedName,
        description: aiRecipe.description,
        prepTime: aiRecipe.prepTime,
        cookTime: aiRecipe.cookTime,
        servings: aiRecipe.servings,
        ingredients: aiRecipe.ingredients,
        instructions: aiRecipe.instructions,
      },
      userGivenName,
      visibility,
      finalDietaryRestrictions,
      includeDietaryRestrictions
    );

    logger.info(
      `Forked recipe ${sourceRecipeId} version ${sourceVersionId} to ${forkedRecipe.id} for user ${user.id}`
    );

    return c.json(forkedRecipe, 200);
  } catch (error) {
    logger.error("Error forking recipe", { error });
    throw new HTTPException({
      reason: "INTERNAL_SERVER_ERROR",
      message: "Failed to fork recipe",
    });
  }
};

export const ForkRecipe = {
  route,
  handler,
};
