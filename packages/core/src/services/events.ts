import { z } from "zod";

const BaseEvent = z.object({
  _id: z.string(),
  key: z.string(),
  timestamp: z.string().pipe(z.coerce.date()),
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

export type RecipeVersionCreatedEvent = z.infer<
  typeof RecipeVersionCreatedEvent
>;

export const Events = z.discriminatedUnion("type", [
  UserCreatedEvent,
  RecipeVersionCreatedEvent,
  UserActivityEvent,
]);

export type Events = z.infer<typeof Events>;
