import { UserService } from "@on-it-chef/core/services/users";
import { MongoClient } from "@on-it-chef/core/services/db";
import { Root } from "./app";
import { Resource } from "sst";
import { RecipeService } from "@on-it-chef/core/services/recipes";

let mongoClient: MongoClient | null = null;
let userService: UserService | null = null;
let recipesService: RecipeService | null = null;

export async function init(): Promise<Root> {
  if (!mongoClient) {
    mongoClient = new MongoClient(Resource.MongoUrl.value);
    await mongoClient.connect();
  }

  if (!userService) {
    userService = new UserService(mongoClient);
  }

  if (!recipesService) {
    recipesService = new RecipeService(mongoClient);
  }

  return {
    env: "development",
    secrets: {
      clerkWebhookSecret: Resource.ClerkWebhookSecret.value,
    },
    services: {
      userService,
      recipesService,
    },
  };
}
