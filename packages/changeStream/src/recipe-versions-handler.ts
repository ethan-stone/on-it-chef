import { MongoRecipeVersion } from "@on-it-chef/core/services/recipes";
import { ChangeStreamHandler } from "./change-stream";

export const recipeVersionsHandler: ChangeStreamHandler = async (options) => {
  if (options.change.operationType === "insert") {
    const recipeVersion = options.change.fullDocument as MongoRecipeVersion;
  }
};
