import { MongoClient } from "@on-it-chef/core/services/db";
import { EnvSecretService } from "@on-it-chef/core/services/secrets";

const secretService = new EnvSecretService();

let mongoClient: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    mongoClient = new MongoClient(await secretService.get("MONGO_URL"));
    await mongoClient.connect();
  }
  return mongoClient;
}
