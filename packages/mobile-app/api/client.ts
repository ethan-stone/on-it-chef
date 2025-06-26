import { type Routes } from "@/server/hono";
import { hc } from "hono/client";

export const client = hc<Routes>(process.env.EXPO_PUBLIC_API_URL!);
