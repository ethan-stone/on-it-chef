import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { errorResponseSchemas, HTTPException } from "../errors";
import { HonoEnv } from "../app";
import { checkRateLimit } from "../rate-limit";
import { addMonths } from "@on-it-chef/core/services/users";

const route = createRoute({
  operationId: "getLoggedInUser",
  method: "get" as const,
  path: "/v1/users.getLoggedInUser",
  summary: "Get the current user",
  responses: {
    200: {
      description: "User retrieved",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            email: z.string(),
            dietaryRestrictions: z.string().nullish(),
            remainingRecipeVersions: z.number(),
            recipeVersionsLimit: z.number(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          }),
        },
      },
    },
    ...errorResponseSchemas,
  },
});

const handler: RouteHandler<typeof route, HonoEnv> = async (c) => {
  const logger = c.get("logger");
  let user = c.get("user");
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

  // only top up the remaining recipe versions if the user does not have a subscription
  if (
    (!user.subscription || !user.subscription.shouldGiveAccess) &&
    user.remainingRecipeVersionsTopUpAt < new Date()
  ) {
    user = await root.services.userService.topUpRemainingRecipeVersions(
      user.id,
      {
        newRecipeVersionsLimit: 10,
      }
    );
  }

  return c.json(
    {
      id: user.id,
      email: user.email,
      dietaryRestrictions: user.dietaryRestrictions,
      remainingRecipeVersions: user.remainingRecipeVersions,
      recipeVersionsLimit: user.recipeVersionsLimit,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    200
  );
};

export const GetLoggedInUser = {
  route,
  handler,
};
