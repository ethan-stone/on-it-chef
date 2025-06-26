import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../app";
import { errorResponseSchemas, HTTPException } from "../errors";

const route = createRoute({
  operationId: "updateUserSettings",
  method: "put" as const,
  path: "/v1/users.updateUserSettings",
  summary: "Update user settings",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            dietaryRestrictions: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "User settings updated",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            email: z.string(),
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

  const { dietaryRestrictions } = c.req.valid("json");

  try {
    const updatedUser =
      await root.services.userService.updateDietaryRestrictions(
        user.id,
        dietaryRestrictions || null
      );

    logger.info(`Updated dietary restrictions for user ${user.id}`);

    return c.json(updatedUser, 200);
  } catch (error) {
    logger.error("Error updating user settings", { error });
    throw new HTTPException({
      reason: "INTERNAL_SERVER_ERROR",
      message: "Failed to update user settings",
    });
  }
};

export const UpdateUserSettings = {
  route,
  handler,
};
