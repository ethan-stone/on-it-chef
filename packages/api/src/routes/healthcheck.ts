import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { errorResponseSchemas } from "../errors";
import { HonoEnv } from "../app";

const route = createRoute({
  operationId: "healthcheck",
  method: "get" as const,
  path: "/healthcheck",
  summary: "Healthcheck endpoint",
  responses: {
    200: {
      description: "OK",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    ...errorResponseSchemas,
  },
});

export const handler: RouteHandler<typeof route, HonoEnv> = async (c) => {
  return c.json({ message: "OK" }, 200);
};

export const Healthcheck = {
  route,
  handler,
};
