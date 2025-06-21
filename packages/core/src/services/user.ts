import { Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";

const User = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof User>;

type MongoUser = Omit<User, "id"> & {
  _id: string;
};

const toMongo = {
  user: (user: User): MongoUser => {
    return {
      ...user,
      _id: user.id,
    };
  },
};

const fromMongo = {
  user: (mongoUser: MongoUser): User => {
    return {
      ...mongoUser,
      id: mongoUser._id,
    };
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
}
