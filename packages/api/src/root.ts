import { UserService } from "@on-it-chef/core/services/users";
import { MongoClient } from "@on-it-chef/core/services/db";
import { Root } from "./app";
import { RecipeService } from "@on-it-chef/core/services/recipes";
import { RemoteConfigService } from "@on-it-chef/core/services/remote-configs";
import { AdminApiKeyService } from "@on-it-chef/core/services/admin-api-keys";
import { RateLimiter } from "@on-it-chef/core/services/rate-limiter";
import { AiService } from "@on-it-chef/core/services/ai";
import { GoogleGenAI } from "@google/genai";
import { EventService } from "@on-it-chef/core/services/events";
import { RevenueCatService } from "@on-it-chef/core/services/revenue-cat";
import {
  EnvSecretService,
  SecretService,
} from "@on-it-chef/core/services/secrets";

let secretService: SecretService | null = null;
let mongoClient: MongoClient | null = null;
let userService: UserService | null = null;
let recipesService: RecipeService | null = null;
let remoteConfigService: RemoteConfigService | null = null;
let adminApiKeyService: AdminApiKeyService | null = null;
let rateLimiter: RateLimiter | null = null;
let aiService: AiService | null = null;
let eventService: EventService | null = null;
let revenueCatService: RevenueCatService | null = null;
let googleGenAI: GoogleGenAI | null = null;

export async function init(): Promise<Root> {
  if (!secretService) {
    secretService = new EnvSecretService();
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(await secretService.get("mongoUrl"));
    await mongoClient.connect();
  }

  if (!googleGenAI) {
    googleGenAI = new GoogleGenAI({
      apiKey: await secretService.get("geminiApiKey"),
    });
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

  if (!eventService) {
    eventService = new EventService(mongoClient);
  }

  if (!revenueCatService) {
    revenueCatService = new RevenueCatService({
      apiKey: await secretService.get("revenueCatRestApiKey"),
      projectId: await secretService.get("revenueCatProjectId"),
    });
  }

  return {
    env: "development",
    secrets: {
      clerkWebhookSecret: await secretService.get("clerkWebhookSecret"),
      revenueCatWebhookAuthHeader: await secretService.get(
        "revenueCatWebhookAuthHeader"
      ),
    },
    services: {
      userService,
      recipesService,
      remoteConfigService,
      adminApiKeyService,
      rateLimiter,
      aiService,
      eventService,
      revenueCatService,
      secretService,
    },
  };
}
