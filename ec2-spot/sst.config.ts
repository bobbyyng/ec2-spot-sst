/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "ec2-spot-sst",
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: ["prod", "dev"].includes(input?.stage),
      home: "aws",
      providers: { aws: "7.16.0" },
    };
  },
  async run() {
    if (!["prod", "dev"].includes($app.stage)) {
      return;
    }

    const instanceInfra = await import("./infra/instance.infra")

    return {
      instanceSpot: instanceInfra.instanceSpot.arn,
    }
  },
});
