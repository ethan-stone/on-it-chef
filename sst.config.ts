/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "on-it-chef",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile: "admin-personal",
        },
      },
    };
  },
  async run() {
    const { readdirSync } = await import("fs");

    const outputs = {};

    for (const value of readdirSync("./infra/")) {
      const result = await import(`./infra/${value}`);
      if (result.outputs) Object.assign(outputs, result.outputs);
    }

    return outputs;
  },
});
