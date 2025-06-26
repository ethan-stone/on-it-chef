import { UserService } from "@on-it-chef/core/services/users";
import { MongoClient } from "@on-it-chef/core/services/db";
import { Root } from "./app";
import { Resource } from "sst";

let mongoClient: MongoClient | null = null;
let userService: UserService | null = null;

export async function init(): Promise<Root> {
  if (!mongoClient) {
    mongoClient = new MongoClient(Resource.MongoUrl.value);
  }

  if (!userService) {
    userService = new UserService(mongoClient);
  }

  return {
    env: "development",
    secrets: {
      clerkWebhookSecret: Resource.ClerkWebhookSecret.value,
    },
    services: {
      userService,
    },
  };
}
