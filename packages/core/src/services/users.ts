import { Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";

const User = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullish(),
  dietaryRestrictions: z.string().nullish(),
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

export class UserService {
  private dbName = "onItChef";
  private usersColl: Collection<MongoUser>;

  constructor(private readonly client: MongoClient) {
    this.usersColl = this.client.db(this.dbName).collection<MongoUser>("users");
  }

  private uid(prefix: "user") {
    return `${prefix}_${ulid()}`;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const id = this.uid("user");
    const mongoUser = toMongo.user({ ...user, id });
    await this.usersColl.insertOne(mongoUser);

    return fromMongo.user(mongoUser);
  }
  async getUser(id: string): Promise<User | null> {
    const mongoUser = await this.usersColl.findOne({ _id: id });
    return mongoUser ? fromMongo.user(mongoUser) : null;
  }

  async upsertUser(user: User): Promise<User> {
    const mongoUser = toMongo.user(user);
    await this.usersColl.updateOne(
      { _id: user.id },
      { $set: mongoUser },
      { upsert: true }
    );
    return fromMongo.user(mongoUser);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.usersColl.deleteOne({ _id: userId });
  }

  async getDietaryRestrictions(
    userId: string
  ): Promise<User["dietaryRestrictions"] | null> {
    const { dietaryRestrictions } = (await this.usersColl.findOne(
      { _id: userId },
      { projection: { dietaryRestrictions: 1 } }
    )) as { dietaryRestrictions: User["dietaryRestrictions"] };

    if (!dietaryRestrictions) return null;
    return dietaryRestrictions;
  }

  async updateDietaryRestrictions(
    userId: string,
    dietaryRestrictions: string | null
  ): Promise<User> {
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

    if (!result) {
      throw new Error("User not found");
    }

    return fromMongo.user(result);
  }
}
