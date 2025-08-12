import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { errorResponseSchemas, HTTPException } from "../errors";
import { HonoEnv } from "../app";
import { checkRateLimit } from "../rate-limit";

const route = createRoute({
  operationId: "getAllActiveRemoteConfigs",
  method: "get",
  path: "v1/remoteConfigs.getAllActiveRemoteConfigs",
  responses: {
    200: {
      description: "Remote configs",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              value: z.record(z.string(), z.any()),
              status: z.enum(["active", "inactive"]),
              description: z.string(),
              createdAt: z.string(),
              updatedAt: z.string(),
            })
          ),
        },
      },
    },
    ...errorResponseSchemas,
  },
});

export const handler: RouteHandler<typeof route, HonoEnv> = async (c) => {
  const logger = c.get("logger");
  const root = c.get("root");
  const user = c.get("user");

  if (!user) {
    throw new HTTPException({
      reason: "UNAUTHORIZED",
      message: "Unauthorized. User is required.",
    });
  }

  await checkRateLimit(c, root.services.rateLimiter, {
    entityId: user.id,
    maxRequests: 100,
  });

  logger.info("Getting all active remote configs");

  const remoteConfigs =
    await root.services.remoteConfigService.getAllActiveRemoteConfigs();

  return c.json(remoteConfigs, 200);
};

export const GetAllActiveRemoteConfigs = {
  route,
  handler,
};
