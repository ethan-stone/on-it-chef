import { z } from "zod";

// const exampleCustomer = {
//   object: "customer",
//   id: "19b8de26-77c1-49f1-aa18-019a391603e2",
//   project_id: "proj1ab2c3d4",
//   first_seen_at: 1658399423658,
//   last_seen_at: 1658399423658,
//   last_seen_app_version: "1.0.0",
//   last_seen_country: "US",
//   last_seen_platform: "android",
//   last_seen_platform_version: "35",
//   active_entitlements: {
//     object: "list",
//     items: [
//       {
//         object: "customer.active_entitlement",
//         entitlement_id: "entla1b2c3d4e5",
//         expires_at: 1658399423658,
//       },
//     ],
//     next_page:
//       "/v2/projects/proj1ab2c3d4/customers/19b8de26-77c1-49f1-aa18-019a391603e2/active_entitlements?starting_after=entlab21dac",
//     url: "/v2/projects/proj1ab2c3d4/customers/19b8de26-77c1-49f1-aa18-019a391603e2/active_entitlements",
//   },
//   experiment: {
//     object: "experiment_enrollment",
//     id: "string",
//     name: "string",
//     variant: "a",
//   },
//   attributes: {
//     object: "list",
//     items: [
//       {
//         object: "customer.attribute",
//         name: "$email",
//         value: "garfield@revenuecat.com",
//         updated_at: 1658399423658,
//       },
//     ],
//     next_page:
//       "/v2/projects/proj1ab2c3d4/customers/19b8de26-77c1-49f1-aa18-019a391603e2/attributes?starting_after=myCustomAttribute",
//     url: "/v2/projects/proj1ab2c3d4/customers/19b8de26-77c1-49f1-aa18-019a391603e2/attributes",
//   },
// };

const RevenueCatCustomer = z.object({
  id: z.string(),
  object: z.literal("customer"),
  project_id: z.string(),
  first_seen_at: z.number(),
  last_seen_at: z.number(),
  last_seen_app_version: z.string(),
  last_seen_country: z.string(),
  last_seen_platform: z.string(),
  last_seen_platform_version: z.string(),
  active_entitlements: z.object({
    object: z.literal("list"),
    items: z.array(
      z.object({
        object: z.literal("customer.active_entitlement"),
        entitlement_id: z.string(),
        expires_at: z.number(),
      })
    ),
    next_page: z.string().nullish(),
    url: z.string(),
  }),
  experiment: z
    .object({
      object: z.literal("experiment_enrollment"),
      id: z.string(),
      name: z.string(),
      variant: z.string(),
    })
    .nullish(),
  attributes: z
    .object({
      object: z.literal("list"),
      items: z.array(
        z.object({
          object: z.literal("customer.attribute"),
          name: z.string(),
          value: z.string(),
          updated_at: z.number(),
        })
      ),
      next_page: z.string(),
      url: z.string(),
    })
    .nullish(),
});

export type RevenueCatCustomer = z.infer<typeof RevenueCatCustomer>;

const RevenueCatEntitlement = z.object({
  object: z.literal("entitlement"),
  project_id: z.string(),
  id: z.string(),
  lookup_key: z.string(),
  display_name: z.string(),
  created_at: z.number(),
});

export type RevenueCatEntitlement = z.infer<typeof RevenueCatEntitlement>;

// const exampleCustomerSubscriptions = {
//   object: "list",
//   items: [
//     {
//       object: "subscription",
//       id: "sub1ab2c3d4e5",
//       customer_id: "19b8de26-77c1-49f1-aa18-019a391603e2",
//       original_customer_id: "19b8de26-77c1-49f1-aa18-019a391603e2",
//       product_id: "prod1a2b3c4d5e",
//       starts_at: 1658399423658,
//       current_period_starts_at: 1658399423658,
//       current_period_ends_at: 1658399423658,
//       gives_access: true,
//       pending_payment: true,
//       auto_renewal_status: "will_renew",
//       status: "trialing",
//       total_revenue_in_usd: {
//         currency: "USD",
//         gross: 9.99,
//         commission: 2.99,
//         tax: 0.75,
//         proceeds: 6.25,
//       },
//       presented_offering_id: "ofrnge1a2b3c4d5",
//       entitlements: {
//         object: "list",
//         items: [
//           {
//             object: "entitlement",
//             project_id: "proj1ab2c3d4",
//             id: "entla1b2c3d4e5",
//             lookup_key: "premium",
//             display_name: "Premium",
//             created_at: 1658399423658,
//             products: {
//               object: "list",
//               items: [
//                 {
//                   object: "product",
//                   id: "prod1a2b3c4d5e",
//                   store_identifier: "rc_1w_199",
//                   type: "subscription",
//                   subscription: {},
//                   one_time: {},
//                   created_at: 1658399423658,
//                   app_id: "app1a2b3c4",
//                   app: {
//                     amazon: {},
//                     app_store: {},
//                     mac_app_store: {},
//                     play_store: {},
//                     stripe: {},
//                     rc_billing: {},
//                     roku: {},
//                     paddle: {},
//                   },
//                   display_name: "Premium Monthly 2023",
//                 },
//               ],
//               next_page:
//                 "/v2/projects/proj1ab2c3d4/entitlements/entle1a2b3c4d5/products?starting_after=prodeab21dac",
//               url: "/v2/projects/proj1ab2c3d4/entitlements/entle1a2b3c4d5/products",
//             },
//           },
//         ],
//         next_page:
//           "/v2/projects/proj1ab2c3d4/subscriptions/sub1a2b3c4d5e/entitlements?status=active&starting_after=entlab21dac",
//         url: "/v2/projects/proj1ab2c3d4/subscriptions/sub1a2b3c4d5e/entitlements",
//       },
//       environment: "production",
//       store: "amazon",
//       store_subscription_identifier: 12345678,
//       ownership: "purchased",
//       pending_changes: {
//         product: {
//           object: "product",
//           id: "prod1a2b3c4d5e",
//           store_identifier: "rc_1w_199",
//           type: "subscription",
//           subscription: {
//             duration: "P1M",
//             grace_period_duration: "P3D",
//             trial_duration: "P1W",
//           },
//           one_time: {
//             is_consumable: true,
//           },
//           created_at: 1658399423658,
//           app_id: "app1a2b3c4",
//           app: {
//             object: "app",
//             id: "app1a2b3c4",
//             name: "string",
//             created_at: 1658399423658,
//             type: "app_store",
//             project_id: "proj1a2b3c4",
//             amazon: {
//               package_name: "string",
//             },
//             app_store: {
//               bundle_id: "string",
//             },
//             mac_app_store: {
//               bundle_id: "string",
//             },
//             play_store: {
//               package_name: "string",
//             },
//             stripe: {
//               stripe_account_id: "string",
//             },
//             rc_billing: {
//               stripe_account_id: "string",
//               seller_company_name: "string",
//               app_name: "string",
//               seller_company_support_email: "string",
//               support_email: "string",
//               default_currency: "USD",
//             },
//             roku: {
//               roku_channel_id: "string",
//               roku_channel_name: "string",
//             },
//             paddle: {
//               paddle_is_sandbox: true,
//               paddle_api_key:
//                 "stringstringstringstringstringstringstringstringst",
//             },
//           },
//           display_name: "Premium Monthly 2023",
//         },
//       },
//       country: "US",
//       management_url: "https://apps.apple.com/account/subscriptions",
//     },
//   ],
//   next_page:
//     "/v2/projects/proj1ab2c3d4/customers/19b8de26-77c1-49f1-aa18-019a391603e2/subscriptions?starting_after=sub1a2b3c4d",
//   url: "/v2/projects/proj1ab2c3d4/customers/19b8de26-77c1-49f1-aa18-019a391603e2/subscriptions",
// };

const RevenueCatSubscription = z.object({
  object: z.literal("subscription"),
  id: z.string(),
  customer_id: z.string(),
  original_customer_id: z.string(),
  product_id: z.string(),
  starts_at: z.number(),
  current_period_starts_at: z.number(),
  current_period_ends_at: z.number(),
  gives_access: z.boolean(),
  pending_payment: z.boolean(),
  auto_renewal_status: z.string(),
  status: z.enum([
    "trialing",
    "active",
    "expired",
    "in_grace_period",
    "in_billing_retry",
    "unknown",
    "incomplete",
  ]),
  entitlements: z.object({
    object: z.literal("list"),
    items: z.array(RevenueCatEntitlement),
    next_page: z.string().nullish(),
    url: z.string(),
  }),
});

export type RevenueCatSubscription = z.infer<typeof RevenueCatSubscription>;

const RevenueCatGetCustomerSubscriptionsResponse = z.object({
  object: z.literal("list"),
  items: z.array(RevenueCatSubscription),
  next_page: z.string().nullish(),
  url: z.string(),
});

export type RevenueCatGetCustomerSubscriptionsResponse = z.infer<
  typeof RevenueCatGetCustomerSubscriptionsResponse
>;

export type RevenueCatServiceConfig = {
  apiKey: string;
  projectId: string;
};

export class RevenueCatService {
  constructor(private readonly config: RevenueCatServiceConfig) {}

  async getCustomer(userId: string): Promise<RevenueCatCustomer | null> {
    const response = await fetch(
      `https://api.revenuecat.com/v2/projects/${this.config.projectId}/customers/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const parsed = RevenueCatCustomer.safeParse(data);
      if (parsed.success) {
        return parsed.data;
      } else {
        throw new Error(`Failed to parse customer: ${parsed.error}`);
      }
    }

    if (response.status === 404) {
      return null;
    }

    throw new Error(
      `Failed to get customer: ${response.status} ${
        response.statusText
      } ${await response.text()}`
    );
  }

  async getCustomerSubscriptions(
    userId: string
  ): Promise<RevenueCatGetCustomerSubscriptionsResponse> {
    const response = await fetch(
      `https://api.revenuecat.com/v2/projects/${this.config.projectId}/customers/${userId}/subscriptions`,
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const parsed = RevenueCatGetCustomerSubscriptionsResponse.safeParse(data);
      if (parsed.success) {
        return parsed.data;
      } else {
        throw new Error(
          `Failed to parse customer subscriptions: ${parsed.error}`
        );
      }
    }

    if (response.status === 404) {
      return {
        object: "list",
        items: [],
        url: "",
        next_page: null,
      };
    }

    throw new Error(
      `Failed to get customer subscriptions: ${response.status} ${
        response.statusText
      } ${await response.text()}`
    );
  }
}
