import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { errorResponseSchemas, HTTPException } from "../../errors";
import { HonoEnv } from "../../app";
import { WebhookEvent } from "@clerk/backend/webhooks";
import { Webhook } from "svix";
import { addMonths } from "@on-it-chef/core/services/users";

const route = createRoute({
  operationId: "clerkWebhook",
  method: "post" as const,
  path: "/clerk/webhook",
  summary: "Webhook for Clerk events",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({}).passthrough(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Webhook received",
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

const handler: RouteHandler<typeof route, HonoEnv> = async (c) => {
  const logger = c.get("logger");
  const root = c.get("root");

  logger.info("Received clerk webhook");

  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new HTTPException({
      type: "BAD_REQUEST",
      message: "Missing required headers",
    });
  }

  try {
    const headers = {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    };

    const payload = c.env.event.body;

    if (!payload) {
      throw new HTTPException({
        type: "BAD_REQUEST",
        message: "Missing payload",
      });
    }

    const wh = new Webhook(root.secrets.clerkWebhookSecret);

    wh.verify(payload, headers);

    const evt = (await c.req.json()) as WebhookEvent;

    logger.info("Verified clerk webhook");

    const now = new Date();

    if (evt.type === "user.created") {
      logger.info(`Received user.created event for user ${evt.data.id}`);
      await root.services.userService.upsertUser({
        id: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        recipeVersionsLimit: 10,
        remainingRecipeVersions: 10,
        subscriptionTier: "free",
        subscriptionRenewalDate: addMonths(now, 1),
        createdAt: now,
        updatedAt: now,
      });
    } else if (evt.type === "user.updated") {
      logger.info(`Received user.updated event for user ${evt.data.id}`);
      await root.services.userService.upsertUser({
        id: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        recipeVersionsLimit: 10,
        remainingRecipeVersions: 10,
        subscriptionTier: "free",
        subscriptionRenewalDate: addMonths(now, 1),
        createdAt: now,
        updatedAt: now,
      });
    } else if (evt.type === "user.deleted") {
      if (!evt.data.id) {
        logger.error("User deleted event without id", { evt });
        throw new HTTPException({
          type: "BAD_REQUEST",
          message: "User deleted event without id",
        });
      }
      await root.services.userService.deleteUser(evt.data.id);
    }

    return c.json({ message: "Webhook received" }, 200);
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    logger.error("Error processing clerk webhook", { error });
    throw new HTTPException({
      type: "INTERNAL_SERVER_ERROR",
      message: "Error processing clerk webhook",
    });
  }
};

export const ClerkWebhook = {
  route,
  handler,
};
