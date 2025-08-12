import { Collection, MongoClient } from "mongodb";
import { ulid } from "ulid";
import { z } from "zod";
import * as crypto from "node:crypto";

const AdminApiKey = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  status: z.enum(["active", "inactive"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AdminApiKey = z.infer<typeof AdminApiKey>;

const MongoAdminApiKey = AdminApiKey.omit({
  id: true,
}).extend({
  _id: z.string(),
});

export type MongoAdminApiKey = z.infer<typeof MongoAdminApiKey>;

const toMongo = {
  adminApiKey: (adminApiKey: AdminApiKey): MongoAdminApiKey => {
    return MongoAdminApiKey.parse({
      ...adminApiKey,
      _id: adminApiKey.id,
    });
  },
};

const fromMongo = {
  adminApiKey: (mongoAdminApiKey: MongoAdminApiKey): AdminApiKey => {
    return AdminApiKey.parse({
      ...mongoAdminApiKey,
      id: mongoAdminApiKey._id,
    });
  },
};

/**
 * This is a service for managing admin Admin API Keys. These keys
 * are for API Routes that are only accessible to admins, such as
 * updating remote configs.
 */
export class AdminApiKeyService {
  private dbName = "onItChef";
  private adminApiKeysColl: Collection<MongoAdminApiKey>;

  constructor(private readonly client: MongoClient) {
    this.adminApiKeysColl = this.client
      .db(this.dbName)
      .collection<MongoAdminApiKey>("adminApiKeys");
  }

  private uid(prefix: "key") {
    return `${prefix}_${ulid()}`;
  }

  async createAdminApiKey(
    adminApiKey: Omit<AdminApiKey, "id" | "key">
  ): Promise<AdminApiKey> {
    const id = this.uid("key");
    const key = crypto.randomUUID().replace(/-/g, "");
    const hashedKey = crypto.createHash("sha256").update(key).digest("hex");

    const mongoAdminApiKey = toMongo.adminApiKey({
      ...adminApiKey,
      id,
      key: hashedKey,
    });
    await this.adminApiKeysColl.insertOne(mongoAdminApiKey);

    // in create make sure to return the key in plaintext
    return fromMongo.adminApiKey({
      ...mongoAdminApiKey,
      key,
    });
  }

  async getAdminApiKey(key: string): Promise<AdminApiKey | null> {
    const hashedKey = crypto.createHash("sha256").update(key).digest("hex");

    const adminApiKey = await this.adminApiKeysColl.findOne({
      key: hashedKey,
    });

    return adminApiKey ? fromMongo.adminApiKey(adminApiKey) : null;
  }
}
