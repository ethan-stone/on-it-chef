import { randomBytes } from "crypto";

export const uid = (prefix: string) => {
  return prefix + randomBytes(16).toString("hex");
};
