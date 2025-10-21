import { randomBytes } from "crypto";

export const uid = (prefix: string) => {
  return prefix + "_" + randomBytes(16).toString("hex");
};
