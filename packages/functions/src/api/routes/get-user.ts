import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { errorResponseSchemas, HTTPException } from "../errors";
import { HonoEnv } from "../app";

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
  const user = c.get("user");

  if (!user) {
    logger.info("User is not logged in.");

    throw new HTTPException({
      reason: "UNAUTHORIZED",
      message: "User is not logged in.",
    });
  }

  return c.json(
    {
      id: user.id,
      email: user.email,
      dietaryRestrictions: user.dietaryRestrictions,
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
