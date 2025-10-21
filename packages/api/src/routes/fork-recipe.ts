import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";
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

  const canForkRecipe = await root.services.userService.canCreateRecipeVersion(
    user.id
  );

  if (!canForkRecipe.success) {
    throw new HTTPException({
      type: "FORBIDDEN",
      message: canForkRecipe.message,
      code: canForkRecipe.code,
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
        type: "NOT_FOUND",
        message: "Source recipe not found",
      });
    }

    // Check if user owns the recipe or if it's shared with them
    const isOwner = sourceRecipe.userId === user.id;
    const sharedRecipe = await root.services.recipesService.getSharedRecipe(
      sourceRecipeId,
      user.id
    );
    const isShared = !isOwner && !!sharedRecipe;

    if (!isOwner && !isShared) {
      throw new HTTPException({
        type: "FORBIDDEN",
        message: "You don't have permission to fork this recipe",
      });
    }

    const sourceVersion = sourceRecipe.recentVersions.find(
      (v) => v.id === sourceVersionId
    );

    if (!sourceVersion) {
      throw new HTTPException({
        type: "NOT_FOUND",
        message: "Source recipe version not found",
      });
    }

    // Use user's dietary restrictions if includeDietaryRestrictions is true
    const finalDietaryRestrictions =
      customDietaryRestrictions ||
      (includeDietaryRestrictions ? user.dietaryRestrictions : undefined);

    // Generate the forked recipe using AI
    const aiResponse = await root.services.aiService.generateStructuredContent({
      prompt: root.services.recipesService.formatForkRecipePrompt(
        userPrompt,
        sourceVersion,
        finalDietaryRestrictions
      ),
      schema: root.services.recipesService.structuredAIRecipeResponseSchema,
    });

    const forkedRecipe = await root.services.recipesService.forkRecipe(
      sourceRecipeId,
      sourceVersionId,
      user.id,
      userPrompt,
      {
        generatedName: aiResponse.content.generatedName,
        description: aiResponse.content.description,
        prepTime: aiResponse.content.prepTime,
        cookTime: aiResponse.content.cookTime,
        servings: aiResponse.content.servings,
        ingredients: aiResponse.content.ingredients,
        instructions: aiResponse.content.instructions,
      },
      userGivenName,
      visibility,
      finalDietaryRestrictions || undefined,
      aiResponse.usageMetadata
    );

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
  } catch (error) {
    logger.error("Error forking recipe", { error });
    throw new HTTPException({
      type: "INTERNAL_SERVER_ERROR",
      message: "Failed to fork recipe",
    });
  }
};

export const ForkRecipe = {
  route,
  handler,
};
