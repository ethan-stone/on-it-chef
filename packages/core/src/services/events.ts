import { Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";

const BaseEvent = z.object({
  _id: z.string(),
  key: z.string(),
  timestamp: z.string().pipe(z.coerce.date()),
  processedAt: z.string().pipe(z.coerce.date()).nullish(),
  metadata: z.record(z.string(), z.string()).nullish(),
});

const RecipeVersionCreatedEvent = BaseEvent.extend({
  type: z.literal("recipe_version.created"),
  payload: z.object({
    model: z.string(),
    durationMs: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    recipeVersionId: z.string(),
    recipeId: z.string(),
    userId: z.string(), // The userId will be the key for this event type.
  }),
});

export type RecipeVersionCreatedEvent = z.infer<
  typeof RecipeVersionCreatedEvent
>;

const UserCreatedEvent = BaseEvent.extend({
  type: z.literal("user.created"),
  payload: z.object({
    userId: z.string(),
  }),
});

const UserActivityEvent = BaseEvent.extend({
  type: z.literal("user.activity"),
  payload: z.object({
    userId: z.string(),
  }),
});

const RevenueCatSubscriptionInitialPurchaseEvent = BaseEvent.extend({
  type: z.literal("revenuecat.subscription.initial_purchase"),
  payload: z.object({
    userId: z.string(),
  }),
});

export type RevenueCatSubscriptionInitialPurchaseEvent = z.infer<
  typeof RevenueCatSubscriptionInitialPurchaseEvent
>;

const RevenueCatSubscriptionRenewalEvent = BaseEvent.extend({
  type: z.literal("revenuecat.subscription.renewal"),
  payload: z.object({
    userId: z.string(),
  }),
});

export type RevenueCatSubscriptionRenewalEvent = z.infer<
  typeof RevenueCatSubscriptionRenewalEvent
>;

const RevenueCatSubscriptionCancellationEvent = BaseEvent.extend({
  type: z.literal("revenuecat.subscription.cancellation"),
  payload: z.object({
    userId: z.string(),
  }),
});

export type RevenueCatSubscriptionCancellationEvent = z.infer<
  typeof RevenueCatSubscriptionCancellationEvent
>;

const RevenueCatSubscriptionUncancellationEvent = BaseEvent.extend({
  type: z.literal("revenuecat.subscription.uncancellation"),
  payload: z.object({
    userId: z.string(),
  }),
});

export type RevenueCatSubscriptionUncancellationEvent = z.infer<
  typeof RevenueCatSubscriptionUncancellationEvent
>;

const RevenueCatSubscriptionExpirationEvent = BaseEvent.extend({
  type: z.literal("revenuecat.subscription.expiration"),
  payload: z.object({
    userId: z.string(),
  }),
});

export type RevenueCatSubscriptionExpirationEvent = z.infer<
  typeof RevenueCatSubscriptionExpirationEvent
>;

export type RevenueCatSubscriptionEvent =
  | RevenueCatSubscriptionInitialPurchaseEvent
  | RevenueCatSubscriptionRenewalEvent
  | RevenueCatSubscriptionCancellationEvent
  | RevenueCatSubscriptionUncancellationEvent
  | RevenueCatSubscriptionExpirationEvent;

export const Events = z.discriminatedUnion("type", [
  UserCreatedEvent,
  UserActivityEvent,
  RecipeVersionCreatedEvent,
  RevenueCatSubscriptionInitialPurchaseEvent,
  RevenueCatSubscriptionRenewalEvent,
  RevenueCatSubscriptionCancellationEvent,
  RevenueCatSubscriptionUncancellationEvent,
  RevenueCatSubscriptionExpirationEvent,
]);

export type Events = z.infer<typeof Events>;

export class EventService {
  private dbName = "onItChef";
  private eventsColl: Collection<Events>;

  constructor(private readonly client: MongoClient) {
    this.eventsColl = this.client.db(this.dbName).collection<Events>("events");
  }

  public uid(prefix: "evt") {
    return `${prefix}_${ulid()}`;
  }

  async createEvent(event: Events): Promise<void> {
    await this.eventsColl.insertOne(event);
  }
}
