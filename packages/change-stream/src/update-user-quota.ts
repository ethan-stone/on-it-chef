import { RecipeVersionCreatedEvent } from "@on-it-chef/core/services/events";
import { Root } from "./root";
import { logger } from "./logger";

export async function updateUserQuota(
  root: Root,
  event: RecipeVersionCreatedEvent
) {
  const userService = root.services.userService;
  await userService.decrementRemainingRecipeVersions(event.payload.userId);
  logger.info(`Updated user quota for user ${event.payload.userId}`);
}
