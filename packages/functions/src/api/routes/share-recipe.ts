import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { errorResponseSchemas, HTTPException } from "../errors";
import { HonoEnv } from "../app";

const route = createRoute({
  operationId: "shareRecipe",
  method: "post",
  path: "/v1/recipes.shareRecipe",
  summary: "Share a recipe with a user",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            recipeId: z.string(),
            shareWithEmail: z.string().toLowerCase().trim(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Recipe shared",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
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

  const { recipeId, shareWithEmail } = c.req.valid("json");

  try {
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
        message: "You don't have permission to share this recipe",
      });
    }

    const sharedWithUser = await root.services.userService.getUserByEmail(
      shareWithEmail
    );

    if (!sharedWithUser) {
      logger.info(
        `User with provided email not found. Return early and consider it success since we don't want to expose the user doesn't exist.`
      );
      return c.json(
        {
          success: true,
        },
        200
      );
    }

    if (sharedWithUser.id === user.id) {
      logger.info(
        `User is trying to share with themself. Return early and consider it success.`
      );
      return c.json(
        {
          success: true,
        },
        200
      );
    }

    await root.services.recipesService.shareRecipe(recipeId, sharedWithUser.id);

    // TODO: Send email and/or push notification to the shared user.

    return c.json(
      {
        success: true,
      },
      200
    );
  } catch (error) {
    logger.error("Error sharing recipe", { error });

    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException({
      reason: "INTERNAL_SERVER_ERROR",
      message: "Failed to share recipe",
    });
  }
};

export const ShareRecipe = {
  route,
  handler,
};
