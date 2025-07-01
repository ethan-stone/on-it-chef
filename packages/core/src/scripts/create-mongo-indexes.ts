import { MongoClient } from "mongodb";
import { Resource } from "sst";
import {
  MongoRecipe,
  MongoRecipePrompt,
  MongoRecipeVersion,
  MongoSharedRecipe,
} from "../services/recipes";
import { MongoUser } from "../services/users";

const mongoUrl = Resource.MongoUrl.value;

const client = new MongoClient(mongoUrl);

async function createIndexes() {
  const db = client.db("onItChef");
  const recipes = db.collection<MongoRecipe>("recipes");
  const recipeVersions = db.collection<MongoRecipeVersion>("recipeVersions");
  const recipePrompts = db.collection<MongoRecipePrompt>("recipePrompts");
  const sharedRecipes = db.collection<MongoSharedRecipe>("sharedRecipes");
  const users = db.collection<MongoUser>("users");

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

  await recipePrompts.createIndex({
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
                type: "string",
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

  await client.close();
}

createIndexes();
