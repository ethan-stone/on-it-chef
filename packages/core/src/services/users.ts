import { Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";
import { Events } from "./events";
import { RemoteConfigService } from "./remote-configs";

/**
 * OnItChef subscription handling.
 *
 * Users can be in one of three states:
 * - Free: They have a free subscription.
 * - Trial: They have a trial subscription.
 * - Pro: They have a paid subscription.
 *
 * All subscriptions have a "subscriptionRenewalDate", including free.
 *
 * For free users, topping up the remaining recipe versions and updating the "subscriptionRenewalDate" is lazy. We check and update this in the "get-user" api route handler, which is essentially when the user users the app.
 *
 * For trial and pro users, we listen to a RevenueCat webhook to top up the remaining recipe versions and update the "subscriptionRenewalDate".
 */

const User = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullish(),
  dietaryRestrictions: z.string().nullish(),
  subscriptionTier: z.enum(["free", "trial", "pro"]),
  subscriptionRenewalDate: z.date(), // The date when the user's subscription expires. This is also the renewal date. If they renew this will be updated. This is present even for free users.
  recipeVersionsLimit: z.number(),
  remainingRecipeVersions: z.number(),
  lastActiveAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const MongoUser = User.omit({
  id: true,
}).extend({
  _id: z.string(),
});

export type User = z.infer<typeof User>;

export type MongoUser = z.infer<typeof MongoUser>;

const toMongo = {
  user: (user: User): MongoUser => {
    return MongoUser.parse({
      ...user,
      _id: user.id,
    });
  },
};

const fromMongo = {
  user: (mongoUser: MongoUser): User => {
    return User.parse({
      ...mongoUser,
      id: mongoUser._id,
    });
  },
};

export type CanCreateRecipeResult =
  | {
      success: true;
    }
  | {
      success: false;
      code: "SUBSCRIPTION_EXPIRED" | "RECIPE_VERSIONS_LIMIT_REACHED";
      message: string;
    };

type TopUpRemainingRecipeVersionsArgs = {
  subscriptionRenewalDate?: Date; // An optional date to set the subscription renewal date to. If not provided, the subscription renewal date will be set to 1 month from the current date.
};

/**
 * Adds `count` months to a given date.
 * If the target month has fewer days than the original date,
 * it will clamp to the last valid day of the target month.
 *
 * Example:
 *   addMonths(new Date("2025-01-31"), 1) -> 2025-02-28
 *   addMonths(new Date("2024-01-31"), 1) -> 2024-02-29 (leap year)
 */
export function addMonths(date: Date, count: number): Date {
  const newDate = new Date(date.getTime());

  const targetMonth = newDate.getMonth() + count;
  const targetYear = newDate.getFullYear();

  // Set to the 1st of the target month first (to avoid overflow issues)
  const result = new Date(targetYear, targetMonth, 1);

  // Get the last day of the target month
  const lastDayOfTargetMonth = new Date(
    targetYear,
    targetMonth + 1,
    0 // day 0 of next month = last day of target month
  ).getDate();

  // Clamp the day to the last valid day of the target month
  const day = Math.min(newDate.getDate(), lastDayOfTargetMonth);
  result.setDate(day);

  return result;
}

export class UserService {
  private dbName = "onItChef";
  private usersColl: Collection<MongoUser>;
  private eventsColl: Collection<Events>;

  constructor(
    private readonly client: MongoClient,
    private readonly remoteConfigsService: RemoteConfigService
  ) {
    this.usersColl = this.client.db(this.dbName).collection<MongoUser>("users");
    this.eventsColl = this.client.db(this.dbName).collection<Events>("events");
  }

  private uid(prefix: "user" | "evt") {
    return `${prefix}_${ulid()}`;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const startTime = Date.now();
    const id = this.uid("user");

    const session = this.client.startSession();

    const mongoUser = await session.withTransaction(async (session) => {
      const mongoUser = toMongo.user({ ...user, id });
      await this.usersColl.insertOne(mongoUser, { session });
      await this.eventsColl.insertOne(
        {
          _id: this.uid("evt"),
          type: "user.created",
          key: id,
          timestamp: new Date(),
          payload: {
            userId: id,
          },
        },
        {
          session,
        }
      );
      return mongoUser;
    });

    await session.endSession();

    const duration = Date.now() - startTime;
    console.log(`[DB] createUser: ${duration}ms`);
    return fromMongo.user(mongoUser);
  }

  async getUser(id: string): Promise<User | null> {
    const startTime = Date.now();
    const mongoUser = await this.usersColl.findOne({ _id: id });
    const duration = Date.now() - startTime;
    console.log(`[DB] getUser: ${duration}ms`);
    return mongoUser ? fromMongo.user(mongoUser) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const startTime = Date.now();
    const mongoUser = await this.usersColl.findOne({ email });
    const duration = Date.now() - startTime;
    console.log(`[DB] getUserByEmail: ${duration}ms`);
    return mongoUser ? fromMongo.user(mongoUser) : null;
  }

  async upsertUser(user: User): Promise<User> {
    const startTime = Date.now();

    const session = this.client.startSession();

    const mongoUser = await session.withTransaction(async (session) => {
      const mongoUser = toMongo.user(user);

      const result = await this.usersColl.updateOne(
        { _id: user.id },
        { $set: mongoUser },
        { upsert: true, session }
      );

      if (result.upsertedId) {
        await this.eventsColl.insertOne(
          {
            _id: this.uid("evt"),
            type: "user.created",
            key: user.id,
            timestamp: new Date(),
            payload: {
              userId: user.id,
            },
          },
          { session }
        );
      }

      return mongoUser;
    });

    const duration = Date.now() - startTime;
    console.log(`[DB] upsertUser: ${duration}ms`);
    return fromMongo.user(mongoUser);
  }

  async deleteUser(userId: string): Promise<void> {
    const startTime = Date.now();
    await this.usersColl.deleteOne({ _id: userId });
    const duration = Date.now() - startTime;
    console.log(`[DB] deleteUser: ${duration}ms`);
  }

  async getDietaryRestrictions(
    userId: string
  ): Promise<User["dietaryRestrictions"] | null> {
    const startTime = Date.now();
    const { dietaryRestrictions } = (await this.usersColl.findOne(
      { _id: userId },
      { projection: { dietaryRestrictions: 1 } }
    )) as { dietaryRestrictions: User["dietaryRestrictions"] };
    const duration = Date.now() - startTime;
    console.log(`[DB] getDietaryRestrictions: ${duration}ms`);
    if (!dietaryRestrictions) return null;
    return dietaryRestrictions;
  }

  async updateDietaryRestrictions(
    userId: string,
    dietaryRestrictions: string | null
  ): Promise<User> {
    const startTime = Date.now();
    const now = new Date();

    const result = await this.usersColl.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          dietaryRestrictions,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );
    const duration = Date.now() - startTime;
    console.log(`[DB] updateDietaryRestrictions: ${duration}ms`);

    if (!result) {
      throw new Error("User not found");
    }

    return fromMongo.user(result);
  }

  async canCreateRecipeVersion(userId: string): Promise<CanCreateRecipeResult> {
    const user = await this.getUser(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const purchasesEnabled = (
      await this.remoteConfigsService.getRemoteConfig("purchasesEnabled", {
        defaultValue: { enabled: true },
        filter: { status: "active" },
      })
    ).value.enabled;

    // If purchases are enabled check they are up to date on billing.
    if (
      purchasesEnabled &&
      user.subscriptionRenewalDate &&
      user.subscriptionRenewalDate < new Date()
    ) {
      return {
        success: false,
        code: "SUBSCRIPTION_EXPIRED",
        message: "Subscription expired",
      };
    }

    if (user.remainingRecipeVersions <= 0) {
      return {
        success: false,
        code: "RECIPE_VERSIONS_LIMIT_REACHED",
        message:
          "You have reached the maximum number of recipes you can create. You can upgrade your subscription to create more recipes.",
      };
    }

    return { success: true };
  }

  async decrementRemainingRecipeVersions(userId: string): Promise<void> {
    const startTime = Date.now();
    await this.usersColl.updateOne(
      { _id: userId },
      { $inc: { remainingRecipeVersions: -1 } }
    );
    const duration = Date.now() - startTime;
    console.log(`[DB] decrementRemainingRecipeVersions: ${duration}ms`);
  }

  async topUpRemainingRecipeVersions(
    userId: string,
    args: TopUpRemainingRecipeVersionsArgs
  ): Promise<User> {
    const startTime = Date.now();
    const user = await this.getUser(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const result = await this.usersColl.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          recipeVersionsLimit: user.recipeVersionsLimit,
          remainingRecipeVersions: user.recipeVersionsLimit,
          subscriptionRenewalDate: args.subscriptionRenewalDate
            ? args.subscriptionRenewalDate
            : addMonths(new Date(), 1),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error("User not found");
    }

    const duration = Date.now() - startTime;
    console.log(`[DB] topUpRemainingRecipeVersions: ${duration}ms`);

    return fromMongo.user(result);
  }

  async updateLastActiveAt(userId: string): Promise<void> {
    const startTime = Date.now();

    const session = this.client.startSession();

    await session.withTransaction(async (session) => {
      const user = await this.usersColl.findOneAndUpdate(
        { _id: userId },
        { $set: { lastActiveAt: new Date() } },
        { session, returnDocument: "before" }
      );

      /**
       * If the user has never been active, record an activity event.
       */
      if (user && !user.lastActiveAt) {
        await this.eventsColl.insertOne(
          {
            _id: this.uid("evt"),
            type: "user.activity",
            key: userId,
            timestamp: new Date(),
            payload: {
              userId,
            },
          },
          { session }
        );
      }

      /**
       * The lowest resolution for tracking user activity is 1 day.
       * So we only record an activity event if the current day is different than the day of the previous "lastActiveAt".
       */
      if (
        user &&
        user.lastActiveAt &&
        user.lastActiveAt.getDate() !== new Date().getDate()
      ) {
        await this.eventsColl.insertOne(
          {
            _id: this.uid("evt"),
            type: "user.activity",
            key: userId,
            timestamp: new Date(),
            payload: {
              userId,
            },
          },
          { session }
        );
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[DB] updateLastActiveAt: ${duration}ms`);
  }
}
