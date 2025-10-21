import { Events } from "@on-it-chef/core/services/events";
import { ChangeStreamHandler } from "./change-stream";
import { logger } from "./logger";
import { getMongoClient } from "./mongo-client";
import { updateUserQuota } from "./update-user-quota";
import { init } from "./root";
import { syncUserSubscription } from "./sync-user-subscription";

export const eventsHandler: ChangeStreamHandler = async (options) => {
  if (
    options.change.operationType === "insert" &&
    options.change.ns.coll === "events"
  ) {
    const event = options.change.fullDocument as Events;

    if (event.processedAt) {
      logger.info(`Event ${event._id} already processed. Skipping.`);
      return;
    }

    switch (event.type) {
      case "recipe_version.created":
        await updateUserQuota(await init(), event);
        break;
      case "revenuecat.subscription.initial_purchase":
      case "revenuecat.subscription.renewal":
      case "revenuecat.subscription.cancellation":
      case "revenuecat.subscription.uncancellation":
      case "revenuecat.subscription.expiration": {
        await syncUserSubscription(await init(), event);
      }
    }

    const client = await getMongoClient();

    const eventsCollection = client.db("onItChef").collection<Events>("events");

    const processedAt = new Date();

    await eventsCollection.updateOne(
      { _id: event._id },
      { $set: { processedAt } }
    );

    logger.info(
      `Processed event ${event._id} at ${processedAt.toISOString()}.`
    );
  }
};
