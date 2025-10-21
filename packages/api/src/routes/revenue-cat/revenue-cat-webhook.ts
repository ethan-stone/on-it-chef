import { createRoute, RouteHandler, z } from "@hono/zod-openapi";
import { HonoEnv } from "../../app";
import { errorResponseSchemas, HTTPException } from "../../errors";
import { RevenueCatSubscriptionEvent } from "@on-it-chef/core/services/events";

// const sampleEvent = {
//   api_version: "1.0",
//   event: {
//     aliases: ["user_31WQzP8sw1MbCoqrhapImOPLrEc"],
//     app_id: "app52058e1a1b",
//     app_user_id: "user_31WQzP8sw1MbCoqrhapImOPLrEc",
//     commission_percentage: 0.3,
//     country_code: "US",
//     currency: "USD",
//     entitlement_id: null,
//     entitlement_ids: ["Base"],
//     environment: "SANDBOX",
//     event_timestamp_ms: 1756060684647,
//     expiration_at_ms: 1756060980000,
//     id: "A4CF0192-2F36-463D-A5F9-45FD5863013E",
//     is_family_share: false,
//     is_trial_conversion: false,
//     metadata: null,
//     offer_code: null,
//     original_app_user_id: "user_31WQzP8sw1MbCoqrhapImOPLrEc",
//     original_transaction_id: "2000000991128954",
//     period_type: "NORMAL",
//     presented_offering_id: "default_offering",
//     price: 4.99,
//     price_in_purchased_currency: 4.99,
//     product_id: "base_monthly_subscription",
//     purchased_at_ms: 1756060680000,
//     renewal_number: 9,
//     store: "APP_STORE",
//     subscriber_attributes: {
//       $attConsentStatus: {
//         updated_at_ms: 1756058065867,
//         value: "notDetermined",
//       },
//     },
//     takehome_percentage: 0.7,
//     tax_percentage: 0,
//     transaction_id: "2000000991136732",
//     type: "RENEWAL",
//   },
// };

const RevenueCatEvent = z.object({
  api_version: z.string(),
  event: z.object({
    type: z.enum([
      "TEST",
      "INITIAL_PURCHASE",
      "NON_RENEWING_PURCHASE",
      "RENEWAL",
      "PRODUCT_CHANGE",
      "CANCELLATION",
      "BILLING_ISSUE",
      "SUBSCRIBER_ALIAS",
      "SUBSCRIPTION_PAUSED",
      "UNCANCELLATION",
      "TRANSFER",
      "SUBSCRIPTION_EXTENDED",
      "EXPIRATION",
      "TEMPORARY_ENTITLEMENT_GRANT",
      "INVOICE_ISSUANCE",
      "VIRTUAL_CURRENCY_TRANSACTION",
    ]),
    id: z.string(),
    app_user_id: z.string(),
    original_app_user_id: z.string(),
    aliases: z.array(z.string()).nullish(),
  }),
});

type RevenueCatEvent = z.infer<typeof RevenueCatEvent>;

const route = createRoute({
  operationId: "revenueCatWebhook",
  method: "post" as const,
  path: "/revenue-cat/webhook",
  summary: "Webhook for RevenueCat events",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: RevenueCatEvent,
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
  },
  ...errorResponseSchemas,
});

function mapRevenueCatEventTypeToEventType(
  event: RevenueCatEvent["event"]["type"]
): RevenueCatSubscriptionEvent["type"] | null {
  switch (event) {
    case "EXPIRATION":
      return "revenuecat.subscription.expiration";
    case "INITIAL_PURCHASE":
      return "revenuecat.subscription.initial_purchase";
    case "RENEWAL":
      return "revenuecat.subscription.renewal";
    case "CANCELLATION":
      return "revenuecat.subscription.cancellation";
    case "UNCANCELLATION":
      return "revenuecat.subscription.uncancellation";
    default:
      return null;
  }
}

const handler: RouteHandler<typeof route, HonoEnv> = async (c) => {
  const logger = c.get("logger");
  const root = c.get("root");

  logger.info("Received revenue cat webhook");

  const authHeader = c.req.header("Authorization");

  if (authHeader !== root.secrets.revenueCatWebhookAuthHeader) {
    throw new HTTPException({
      type: "UNAUTHORIZED",
      message: "Invalid auth header",
    });
  }

  logger.info("Verified revenue cat webhook");

  const eventService = root.services.eventService;

  const event = c.req.valid("json");

  const eventType = mapRevenueCatEventTypeToEventType(event.event.type);

  if (!eventType) {
    logger.warn(`Unhandled revenue cat event type: ${event.event.type}`);
    return c.json(
      {
        message: "Webhook received",
      },
      200
    );
  }

  await eventService.createEvent({
    _id: eventService.uid("evt"),
    type: eventType,
    payload: {
      userId: event.event.original_app_user_id,
    },
    timestamp: new Date(),
    key: event.event.original_app_user_id,
    metadata: {
      revenueCatEventId: event.event.id,
    },
  });

  return c.json(
    {
      message: "Webhook received",
    },
    200
  );
};

export const RevenueCatWebhook = {
  route,
  handler,
};
