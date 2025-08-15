import { Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";

const RemoteConfig = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["active", "inactive"]),
  value: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RemoteConfig = z.infer<typeof RemoteConfig>;

const MongoRemoteConfig = RemoteConfig.omit({
  id: true,
}).extend({
  _id: z.string(),
});

export type MongoRemoteConfig = z.infer<typeof MongoRemoteConfig>;

const toMongo = {
  remoteConfig: (remoteConfig: RemoteConfig): MongoRemoteConfig => {
    return MongoRemoteConfig.parse({
      ...remoteConfig,
      _id: remoteConfig.id,
    });
  },
};

const fromMongo = {
  remoteConfig: (mongoRemoteConfig: MongoRemoteConfig): RemoteConfig => {
    return RemoteConfig.parse({
      ...mongoRemoteConfig,
      id: mongoRemoteConfig._id,
    });
  },
};

type UpdateRemoteConfigArgs = {
  name: string;
  value?: RemoteConfig["value"];
  status?: RemoteConfig["status"];
  description?: RemoteConfig["description"];
};

export class RemoteConfigService {
  private dbName = "onItChef";
  private remoteConfigsColl: Collection<MongoRemoteConfig>;

  constructor(private readonly client: MongoClient) {
    this.remoteConfigsColl = this.client
      .db(this.dbName)
      .collection<MongoRemoteConfig>("remoteConfigs");
  }

  private uid(prefix: "rc") {
    return `${prefix}_${ulid()}`;
  }

  async getAllActiveRemoteConfigs(): Promise<RemoteConfig[]> {
    const remoteConfigs = await this.remoteConfigsColl
      .find({
        status: "active",
      })
      .toArray();
    return remoteConfigs.map(fromMongo.remoteConfig);
  }

  /**
   * Get a remote config by name. A default value must be provided in case the remote config is not found.
   * @param name - The name of the remote config.
   * @param options - The options for the remote config.
   * @returns The value of the remote config.
   */
  async getRemoteConfig(
    name: string,
    options: {
      filter?: {
        status?: RemoteConfig["status"];
      };
      defaultValue: RemoteConfig["value"];
    }
  ): Promise<{ value: RemoteConfig["value"] }> {
    const remoteConfig = await this.remoteConfigsColl.findOne({
      name,
      ...options.filter,
    });
    return remoteConfig
      ? {
          value: fromMongo.remoteConfig(remoteConfig).value,
        }
      : {
          value: options.defaultValue,
        };
  }

  async createRemoteConfig(
    remoteConfig: Omit<RemoteConfig, "id">
  ): Promise<RemoteConfig> {
    const id = this.uid("rc");

    const mongoRemoteConfig = toMongo.remoteConfig({
      ...remoteConfig,
      id,
    });

    await this.remoteConfigsColl.insertOne(mongoRemoteConfig);
    return fromMongo.remoteConfig(mongoRemoteConfig);
  }

  async updateRemoteConfig(
    args: UpdateRemoteConfigArgs
  ): Promise<RemoteConfig> {
    const { name, value, status, description } = args;
    const mongoRemoteConfig = await this.remoteConfigsColl.findOneAndUpdate(
      { name },
      { $set: { value, status, description } },
      { returnDocument: "after" }
    );
    if (!mongoRemoteConfig) {
      throw new Error("Remote config not found");
    }
    return fromMongo.remoteConfig(mongoRemoteConfig);
  }

  async deleteRemoteConfig(name: string): Promise<void> {
    await this.remoteConfigsColl.deleteOne({ name });
  }
}
