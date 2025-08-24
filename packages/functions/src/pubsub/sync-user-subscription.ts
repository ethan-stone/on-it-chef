import { RevenueCatService } from "@on-it-chef/core/services/revenue-cat";
import { createEventHandler } from "../utils/createEventHandler";
import { Logger } from "../utils/logger";
import { Resource } from "sst";
import { MongoClient } from "@on-it-chef/core/services/db";
import { addMonths, UserService } from "@on-it-chef/core/services/users";
import { RemoteConfigService } from "@on-it-chef/core/services/remote-configs";

const logger = new Logger({
  env: process.env.NODE_ENV === "production" ? "production" : "development",
  service: "functions",
  namespace: "pubsub",
  dataset: "sync-user-subscription",
});

const mongoClient = new MongoClient(Resource.MongoUrl.value);

const revenueCatService = new RevenueCatService({
  apiKey: Resource.RevenueCatRestApiKey.value,
  projectId: Resource.RevenueCatProjectId.value,
});

const remoteConfigService = new RemoteConfigService(mongoClient);

const userService = new UserService(mongoClient, remoteConfigService);

export const main = createEventHandler({
  onEvent: async (event) => {
    console.log(event);
    switch (event.type) {
      case "revenuecat.subscription.initial_purchase":
      case "revenuecat.subscription.renewal":
      case "revenuecat.subscription.cancellation":
      case "revenuecat.subscription.uncancellation":
      case "revenuecat.subscription.expiration": {
        const user = await userService.getUser(event.payload.userId);

        if (!user) {
          logger.error(`User not found for user ${event.payload.userId}`);
          return;
        }

        const customer = await revenueCatService.getCustomer(
          event.payload.userId
        );

        if (!customer) {
          logger.error(`Customer not found for user ${event.payload.userId}`);
          return;
        }

        const subscriptions = await revenueCatService.getCustomerSubscriptions(
          event.payload.userId
        );

        // in the case there is no subscription in RevenueCat
        // we'll set the user the users subscription to null and give them 10 recipe versions
        // this really should not happen because we shouldn't get any events
        // from RevenueCat if there is no subscription
        if (subscriptions.items.length === 0) {
          await userService.updateSubscription(event.payload.userId, null);

          await userService.topUpRemainingRecipeVersions(event.payload.userId, {
            newRecipeVersionsLimit: 10,
          });

          return;
        }

        const mostRecentSubscription = subscriptions.items.sort(
          (a, b) => b.starts_at - a.starts_at
        )[0];

        await userService.updateSubscription(event.payload.userId, {
          tier: "pro",
          status: mostRecentSubscription.status,
          periodStart: new Date(
            mostRecentSubscription.current_period_starts_at
          ),
          periodEnd: new Date(mostRecentSubscription.current_period_ends_at),
          shouldGiveAccess: mostRecentSubscription.gives_access,
        });

        if (
          event.type === "revenuecat.subscription.initial_purchase" ||
          event.type === "revenuecat.subscription.renewal"
        ) {
          await userService.topUpRemainingRecipeVersions(event.payload.userId, {
            newRecipeVersionsLimit: 100,
            nextTopUpAt: new Date(
              mostRecentSubscription.current_period_ends_at
            ),
          });
        }

        if (event.type === "revenuecat.subscription.expiration") {
          await userService.topUpRemainingRecipeVersions(event.payload.userId, {
            newRecipeVersionsLimit: 10,
            nextTopUpAt: addMonths(new Date(), 1),
          });
        }
      }
    }
  },
});
