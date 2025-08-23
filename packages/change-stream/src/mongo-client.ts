import { MongoClient } from "@on-it-chef/core/services/db";
import { Resource } from "sst";

export const client = new MongoClient(Resource.MongoUrl.value);
