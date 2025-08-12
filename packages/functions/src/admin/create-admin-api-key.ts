import { z } from "zod";
import { AdminApiKeyService } from "@on-it-chef/core/services/admin-api-keys";
import { Resource } from "sst";
import { MongoClient } from "@on-it-chef/core/services/db";

const EventSchema = z.object({
  name: z.string(),
});

/**
 * This is a lambda that should be manually called via the dashboard to create an admin api key.
 */
export async function main(event: unknown) {
  const eventData = EventSchema.parse(event);

  const mongoClient = new MongoClient(Resource.MongoUrl.value);

  const adminApiKeyService = new AdminApiKeyService(mongoClient);

  const now = new Date();

  const adminApiKey = await adminApiKeyService.createAdminApiKey({
    name: eventData.name,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return adminApiKey;
}
