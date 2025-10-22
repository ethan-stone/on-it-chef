import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import {
  errorResponseSchemas,
  handleServiceResult,
  HTTPException,
} from "../errors";
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

  const {
    visibility,
    includeDietaryRestrictions,
    customDietaryRestrictions,
    message,
  } = c.req.valid("json");

  const result = await root.services.recipesServiceV2.createRecipe(
    {
      actor: {
        type: "user",
        id: user.id,
      },
      logger,
      scopes: [],
    },
    {
      userId: user.id,
      prompt: message,
      visibility: visibility,
      customDietaryRestrictions: customDietaryRestrictions,
      includeDietaryRestrictions: includeDietaryRestrictions,
    }
  );

  const recipe = handleServiceResult(result, logger, {
    NO_ACCESS: {
      type: "FORBIDDEN",
      message: "You do not have access to create recipes for this user.",
      code: "NO_ACCESS",
    },
    USER_NOT_FOUND: {
      type: "INTERNAL_SERVER_ERROR",
      message: "User is authenticated but does not exist?",
    },
  });

  return c.json(recipe, 200);
};

export const CreateRecipe = {
  route,
  handler,
};
