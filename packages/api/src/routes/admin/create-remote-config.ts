import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { errorResponseSchemas, HTTPException } from "../../errors";
import { HonoEnv } from "../../app";
import { checkRateLimit } from "../../rate-limit";

const route = createRoute({
  operationId: "createRemoteConfig",
  method: "post" as const,
  path: "/admin/remoteConfigs.createRemoteConfig",
  summary: "Create a new remote config",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            name: z.string(),
            value: z.record(z.string(), z.any()),
            status: z.enum(["active", "inactive"]).default("active"),
            description: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Remote config created",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            value: z.record(z.string(), z.any()),
            status: z.enum(["active", "inactive"]),
            description: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
    },
    ...errorResponseSchemas,
  },
});

export const handler: RouteHandler<typeof route, HonoEnv> = async (c) => {
  const logger = c.get("logger");
  const root = c.get("root");
  const adminApiKey = c.get("adminApiKey");

  if (!adminApiKey || adminApiKey.status === "inactive") {
    throw new HTTPException({
      type: "UNAUTHORIZED",
      message: "Unauthorized. Admin API key is required.",
    });
  }

  logger.info(
    `Received request to create remote config by admin api key ${adminApiKey.id}`
  );

  await checkRateLimit(c, root.services.rateLimiter, {
    entityId: adminApiKey.id,
    maxRequests: 100,
  });

  const { name, value, status, description } = c.req.valid("json");

  const now = new Date();

  logger.info("Creating remote config", {
    name,
    value,
    status,
    description,
  });

  const remoteConfig =
    await root.services.remoteConfigService.createRemoteConfig({
      name,
      value,
      status,
      description,
      createdAt: now,
      updatedAt: now,
    });

  logger.info(
    `Remote config created by admin api key ${adminApiKey.id}`,
    remoteConfig
  );

  return c.json(remoteConfig, 200);
};

export const CreateRemoteConfig = {
  route,
  handler,
};
