import { MongoClient } from "mongodb";
import { Resource } from "sst";
import {
  MongoRecipe,
  MongoRecipeVersion,
  MongoSharedRecipe,
} from "../services/recipes";
import { MongoUser } from "../services/users";
import { MongoRemoteConfig } from "../services/remote-configs";
import { MongoAdminApiKey } from "../services/admin-api-keys";
import { MongoRateLimitWindow } from "../services/rate-limiter";
import { Events } from "../services/events";

const mongoUrl = Resource.MongoUrl.value;

const client = new MongoClient(mongoUrl);

async function createIndexes() {
  const db = client.db("onItChef");
  const recipes = db.collection<MongoRecipe>("recipes");
  const recipeVersions = db.collection<MongoRecipeVersion>("recipeVersions");
  const sharedRecipes = db.collection<MongoSharedRecipe>("sharedRecipes");
  const remoteConfigs = db.collection<MongoRemoteConfig>("remoteConfigs");
  const users = db.collection<MongoUser>("users");
  const adminApiKeys = db.collection<MongoAdminApiKey>("adminApiKeys");
  const rateLimitWindows =
    db.collection<MongoRateLimitWindow>("rateLimitWindows");
  const events = db.collection<Events>("events");

  await users.createIndex(
    {
      email: 1,
    },
    {
      unique: true,
    }
  );

  await recipes.createIndex({
    userId: 1,
  });

  await recipeVersions.createIndex({
    recipeId: 1,
  });

  await recipes.createSearchIndex({
    name: "recipesTextSearchIndex",
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          userId: {
            type: "token",
          },
          userGivenName: {
            type: "string",
          },
          recentVersions: {
            type: "document",
            fields: {
              generatedName: {
                type: "string",
              },
              ingredients: {
                type: "document",
                fields: {
                  description: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  await sharedRecipes.createIndex({
    recipeId: 1,
  });

  await sharedRecipes.createIndex({
    sharedBy: 1,
  });

  await sharedRecipes.createIndex({
    sharedWith: 1,
  });

  await sharedRecipes.createIndex({
    sharedWith: 1,
    recipeId: 1,
  });

  await remoteConfigs.createIndex(
    {
      name: 1,
    },
    {
      unique: true,
    }
  );

  await adminApiKeys.createIndex(
    {
      key: 1,
    },
    {
      unique: true,
    }
  );

  await rateLimitWindows.createIndex(
    {
      entityId: 1,
      windowStart: 1,
      windowEnd: 1,
    },
    {
      unique: true,
    }
  );

  await events.createIndex({
    key: 1,
  });

  await events.createIndex({
    timestamp: 1,
  });

  await events.createIndex({
    "payload.userId": 1,
  });

  await events.createIndex({
    key: 1,
  });

  await client.close();
}

createIndexes();
