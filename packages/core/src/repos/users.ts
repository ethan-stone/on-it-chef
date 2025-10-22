import { ClientSession, Collection, MongoClient } from "mongodb";
import { z } from "zod";
import { ulid } from "ulid";
import { withQueryLogging } from "./utils";

const User = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullish(),
  subscription: z
    .object({
      tier: z.enum(["pro"]),
      status: z.enum([
        "trialing",
        "active",
        "expired",
        "in_grace_period",
        "in_billing_retry",
        "unknown",
        "incomplete",
      ]),
      periodStart: z.date(),
      periodEnd: z.date(),
      shouldGiveAccess: z.boolean(), // An easy to use boolean of whether or not the user should be granted the features of the subscription tier.
    })
    .nullish(),
  dietaryRestrictions: z.string().nullish(),
  recipeVersionsLimit: z.number(),
  remainingRecipeVersions: z.number(),
  remainingRecipeVersionsTopUpAt: z.date(), // If the user has a subscription, this is renewal date/period end of the subscription. If not it is manual tracked and lazily updated when fetching the user details.
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

export class UserRepository {
  private dbName = "onItChef";
  private usersColl: Collection<MongoUser>;

  constructor(private readonly client: MongoClient) {
    this.usersColl = this.client.db(this.dbName).collection<MongoUser>("users");
  }

  public uid(prefix: "user") {
    return `${prefix}_${ulid()}`;
  }

  async create(user: User, session?: ClientSession): Promise<User> {
    return withQueryLogging(
      "create",
      this.usersColl.collectionName,
      async () => {
        const mongoUser = toMongo.user(user);
        await this.usersColl.insertOne(mongoUser, { session });
        return fromMongo.user(mongoUser);
      }
    );
  }

  async upsert(
    user: User,
    session?: ClientSession
  ): Promise<User & { upserted: boolean }> {
    return withQueryLogging(
      "upsert",
      this.usersColl.collectionName,
      async () => {
        const mongoUser = toMongo.user(user);
        const result = await this.usersColl.updateOne(
          { _id: user.id },
          { $set: mongoUser },
          { upsert: true, session }
        );
        return {
          ...fromMongo.user(mongoUser),
          upserted: result.upsertedId !== undefined,
        };
      }
    );
  }

  async getById(id: string): Promise<User | null> {
    return withQueryLogging(
      "getById",
      this.usersColl.collectionName,
      async () => {
        const mongoUser = await this.usersColl.findOne({ _id: id });
        return mongoUser ? fromMongo.user(mongoUser) : null;
      }
    );
  }

  async getByEmail(email: string): Promise<User | null> {
    return withQueryLogging(
      "getByEmail",
      this.usersColl.collectionName,
      async () => {
        const mongoUser = await this.usersColl.findOne({ email });
        return mongoUser ? fromMongo.user(mongoUser) : null;
      }
    );
  }

  async deleteById(id: string, session?: ClientSession): Promise<void> {
    return withQueryLogging(
      "deleteById",
      this.usersColl.collectionName,
      async () => {
        await this.usersColl.deleteOne({ _id: id }, { session });
      }
    );
  }

  async updateDietaryRestrictions(
    id: string,
    dietaryRestrictions: string | null,
    session?: ClientSession
  ): Promise<User | null> {
    return withQueryLogging(
      "updateDietaryRestrictions",
      this.usersColl.collectionName,
      async () => {
        const result = await this.usersColl.findOneAndUpdate(
          { _id: id },
          { $set: { dietaryRestrictions } },
          { session }
        );
        return result ? fromMongo.user(result) : null;
      }
    );
  }
}
