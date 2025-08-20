import { secrets } from "./secrets";

export const createAdminApiKeyFn = new sst.aws.Function("CreateAdminApiKeyFn", {
  url: true,
  handler: "packages/functions/src/admin/create-admin-api-key.main",
  timeout: "30 seconds",
  environment: {
    ENVIRONMENT: $app.stage === "production" ? "production" : "development",
  },
  link: [secrets.mongoUrl],
});

const grafanaUser = new aws.iam.User("GrafanaUser", {
  name: "grafana",
});

const grafanaRole = aws.iam.getPolicyDocument({
  statements: [
    {
      effect: "Allow",
      actions: [
        "cloudwatch:DescribeAlarmsForMetric",
        "cloudwatch:DescribeAlarmHistory",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:ListMetrics",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetInsightRuleReport",
      ],
      resources: ["*"],
    },
    {
      effect: "Allow",
      actions: ["pi:GetResourceMetrics"],
      resources: ["*"],
    },
    {
      effect: "Allow",
      actions: [
        "logs:DescribeLogGroups",
        "logs:GetLogGroupFields",
        "logs:StartQuery",
        "logs:StopQuery",
        "logs:GetQueryResults",
        "logs:GetLogEvents",
      ],
      resources: ["*"],
    },
    {
      effect: "Allow",
      actions: [
        "ec2:DescribeTags",
        "ec2:DescribeInstances",
        "ec2:DescribeRegions",
      ],
      resources: ["*"],
    },
    {
      effect: "Allow",
      actions: ["tag:GetResources"],
      resources: ["*"],
    },
  ],
});

new aws.iam.UserPolicy("GrafanaUserPolicy", {
  user: grafanaUser.name,
  policy: grafanaRole.then((role) => role.json),
});
