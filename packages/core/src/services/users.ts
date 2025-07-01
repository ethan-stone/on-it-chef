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
    const startTime = Date.now();
    const id = this.uid("user");
    const mongoUser = toMongo.user({ ...user, id });
    await this.usersColl.insertOne(mongoUser);
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
    const mongoUser = toMongo.user(user);
    await this.usersColl.updateOne(
      { _id: user.id },
      { $set: mongoUser },
      { upsert: true }
    );
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
}
