import { User } from "./users";

type LogMethod = (message?: string, ...args: any[]) => void;

export type ServiceContext = {
  logger: {
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
  };
  actor: {
    type: "user";
    id: string;
  };
  scopes: string[];
};
