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
import { RecipesService } from "@on-it-chef/core/services/recipes.services";
import { RecipeRepository } from "@on-it-chef/core/repos/recipes";
import { RecipeVersionRepository } from "@on-it-chef/core/repos/recipe-versions";
import { SharedRecipeRepository } from "@on-it-chef/core/repos/shared-recipes";
import { RecipeGenerator } from "@on-it-chef/core/gateways/recipe-generator";
import { UserRepository } from "@on-it-chef/core/repos/users";

let secretService: SecretService | null = null;
let mongoClient: MongoClient | null = null;
let userService: UserService | null = null;
let recipesService: RecipeService | null = null;
let recipesServiceV2: RecipesService | null = null;
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
    mongoClient = new MongoClient(await secretService.get("MONGO_URL"));
    await mongoClient.connect();
  }

  if (!googleGenAI) {
    googleGenAI = new GoogleGenAI({
      apiKey: await secretService.get("GEMINI_API_KEY"),
    });
  }

  if (!recipesServiceV2) {
    recipesServiceV2 = new RecipesService(
      mongoClient,
      new RecipeRepository(mongoClient),
      new RecipeVersionRepository(mongoClient),
      new SharedRecipeRepository(mongoClient),
      new RecipeGenerator(googleGenAI),
      new UserRepository(mongoClient)
    );
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
      apiKey: await secretService.get("REVENUE_CAT_REST_API_KEY"),
      projectId: await secretService.get("REVENUE_CAT_PROJECT_ID"),
    });
  }

  return {
    env: "development",
    secrets: {
      clerkWebhookSecret: await secretService.get("CLERK_WEBHOOK_SECRET"),
      revenueCatWebhookAuthHeader: await secretService.get(
        "REVENUE_CAT_WEBHOOK_AUTH_HEADER"
      ),
    },
    services: {
      userService,
      recipesService,
      recipesServiceV2,
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
