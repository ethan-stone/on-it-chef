import { UserService } from "@on-it-chef/core/services/users";
import { MongoClient } from "@on-it-chef/core/services/db";
import { Root } from "./app";
import { Resource } from "sst";
import { RecipeService } from "@on-it-chef/core/services/recipes";
import { RemoteConfigService } from "@on-it-chef/core/services/remote-configs";
import { AdminApiKeyService } from "@on-it-chef/core/services/admin-api-keys";
import { RateLimiter } from "@on-it-chef/core/services/rate-limiter";
import { AiService } from "@on-it-chef/core/services/ai";
import { GoogleGenAI } from "@google/genai";

const googleGenAI = new GoogleGenAI({
  apiKey: Resource.GeminiApiKey.value,
});

let mongoClient: MongoClient | null = null;
let userService: UserService | null = null;
let recipesService: RecipeService | null = null;
let remoteConfigService: RemoteConfigService | null = null;
let adminApiKeyService: AdminApiKeyService | null = null;
let rateLimiter: RateLimiter | null = null;
let aiService: AiService | null = null;

export async function init(): Promise<Root> {
  if (!mongoClient) {
    mongoClient = new MongoClient(Resource.MongoUrl.value);
    await mongoClient.connect();
  }

  if (!recipesService) {
    recipesService = new RecipeService(mongoClient);
  }

  if (!remoteConfigService) {
    remoteConfigService = new RemoteConfigService(mongoClient);
  }

  if (!adminApiKeyService) {
    adminApiKeyService = new AdminApiKeyService(mongoClient);
  }

  if (!rateLimiter) {
    rateLimiter = new RateLimiter(mongoClient);
  }

  if (!userService) {
    userService = new UserService(mongoClient, remoteConfigService);
  }

  if (!aiService) {
    aiService = new AiService(googleGenAI);
  }

  return {
    env: "development",
    secrets: {
      clerkWebhookSecret: Resource.ClerkWebhookSecret.value,
    },
    services: {
      userService,
      recipesService,
      remoteConfigService,
      adminApiKeyService,
      rateLimiter,
      aiService,
    },
  };
}
