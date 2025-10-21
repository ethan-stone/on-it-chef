import { AdminApiKeyService } from "@on-it-chef/core/services/admin-api-keys";
import { Resource } from "sst";
import { MongoClient } from "@on-it-chef/core/services/db";
import { EnvSecretService } from "../services/secrets";

/**
 * This is a lambda that should be manually called via the dashboard to create an admin api key.
 */
export async function main() {
  const name = process.env.ADMIN_API_KEY_NAME;

  if (!name) {
    throw new Error("ADMIN_API_KEY_NAME is not set");
  }

  const secretService = new EnvSecretService();

  const mongoClient = new MongoClient(await secretService.get("mongoUrl"));

  const adminApiKeyService = new AdminApiKeyService(mongoClient);

  const now = new Date();

  const adminApiKey = await adminApiKeyService.createAdminApiKey({
    name,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return adminApiKey;
}

main();
