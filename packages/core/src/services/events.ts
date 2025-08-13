import { z } from "zod";

const BaseEvent = z.object({
  _id: z.string(),
  key: z.string(),
  timestamp: z.date(),
});

const RecipeVersionCreatedEvent = BaseEvent.extend({
  type: z.literal("recipe_version.created"),
  payload: z.object({
    recipeVersionId: z.string(),
    recipeId: z.string(),
    userId: z.string(),
  }),
});

export type RecipeVersionCreatedEvent = z.infer<
  typeof RecipeVersionCreatedEvent
>;

export const Events = z.discriminatedUnion("type", [RecipeVersionCreatedEvent]);

export type Events = z.infer<typeof Events>;
