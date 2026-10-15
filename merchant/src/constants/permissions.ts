/**
 * The fixed catalog of permissions a pharmacy owner can grant to staff.
 *
 * Roles are NOT defined here: every pharmacy creates its own roles and picks any combination of
 * these permissions. The code decides what a permission means (see the guards on each route);
 * the owner decides who holds it.
 *
 * Format: `<area>.<action>`.
 */
export const PERMISSION_GROUPS = [
  {
    key: "products",
    label: "Products & inventory",
    permissions: [
      { key: "products.view", label: "View products", description: "See products, categories, stats and the low-stock list" },
      { key: "products.manage", label: "Manage products", description: "Add, edit, delete and restore products" },
      { key: "products.update_stock", label: "Update stock", description: "Change stock levels only, without editing other product details" },
    ],
  },
  {
    key: "orders",
    label: "Online orders",
    permissions: [
      { key: "orders.view", label: "View orders", description: "See online orders and their details" },
      { key: "orders.manage", label: "Manage orders", description: "Update order status (accept, ready, dispatch, cancel)" },
    ],
  },
  {
    key: "prescriptions",
    label: "Prescriptions",
    permissions: [
      { key: "prescriptions.view", label: "View prescriptions", description: "See submitted prescriptions" },
      { key: "prescriptions.review", label: "Review prescriptions", description: "Approve or reject prescriptions" },
    ],
  },
  {
    key: "sales",
    label: "In-store sales",
    permissions: [
      { key: "sales.create", label: "Record sales", description: "Record an in-store sale and look up products at the till" },
      { key: "sales.view_own", label: "View own sales", description: "See only the sales this person recorded" },
      { key: "sales.view", label: "View all sales", description: "See every in-store sale" },
      { key: "sales.cancel", label: "Cancel sales", description: "Cancel an in-store sale" },
      { key: "sales.refund", label: "Returns & refunds", description: "Process returns and refunds" },
    ],
  },
  {
    key: "discounts",
    label: "Discounts",
    permissions: [
      { key: "discounts.view", label: "View discounts", description: "See discount codes" },
      { key: "discounts.manage", label: "Manage discounts", description: "Create, edit, delete and restore discounts" },
    ],
  },
  {
    key: "wallet",
    label: "Wallet",
    permissions: [
      { key: "wallet.view", label: "View wallet", description: "See the balance and transactions" },
      { key: "wallet.fund", label: "Fund wallet", description: "Add money to the wallet" },
      { key: "wallet.withdraw", label: "Withdraw", description: "Withdraw money to the bank account (high risk)" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    permissions: [
      { key: "dashboard.view", label: "View dashboard", description: "See the dashboard overview" },
      { key: "analytics.view", label: "View analytics", description: "Sales analytics, KPIs and top sellers" },
      { key: "data.export", label: "Export data", description: "Download CSV exports (needs the matching view permission too)" },
    ],
  },
  {
    key: "reviews",
    label: "Customer reviews",
    permissions: [
      { key: "reviews.view", label: "View reviews", description: "See customer reviews" },
      { key: "reviews.reply", label: "Reply to reviews", description: "Reply to customer reviews" },
    ],
  },
  {
    key: "store",
    label: "Store",
    permissions: [
      { key: "store.view", label: "View store settings", description: "See store details, opening hours and delivery settings" },
      { key: "store.manage", label: "Manage store settings", description: "Edit store details, hours, vacation mode and delivery preferences" },
    ],
  },
  {
    key: "team",
    label: "Team",
    permissions: [
      { key: "staff.view", label: "View team", description: "See team members, roles and pending invitations" },
      { key: "staff.manage", label: "Manage team", description: "Invite, suspend and remove staff; change a member's role" },
      { key: "roles.manage", label: "Manage roles", description: "Create, edit and delete roles and choose their permissions" },
      { key: "audit.view", label: "View activity log", description: "See who did what in this pharmacy" },
    ],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key)
) as PermissionKey[];

export const isPermissionKey = (value: unknown): value is PermissionKey =>
  typeof value === "string" && (ALL_PERMISSIONS as string[]).includes(value);

/** A higher permission grants the lower ones, so roles don't need to tick both. */
export const IMPLIED_PERMISSIONS: Partial<Record<PermissionKey, PermissionKey[]>> = {
  "products.manage": ["products.view", "products.update_stock"],
  "orders.manage": ["orders.view"],
  "prescriptions.review": ["prescriptions.view"],
  "sales.view": ["sales.view_own"],
  "discounts.manage": ["discounts.view"],
  "wallet.fund": ["wallet.view"],
  "wallet.withdraw": ["wallet.view"],
  "reviews.reply": ["reviews.view"],
  "store.manage": ["store.view"],
  "staff.manage": ["staff.view"],
  "roles.manage": ["staff.view"],
};

/** Permissions only the pharmacy owner may put into a role (prevents delegating the keys to the team). */
export const OWNER_ONLY_TO_GRANT: PermissionKey[] = ["staff.manage", "roles.manage"];

/** Expand a role's stored permissions into what the person can actually do. Unknown keys are ignored. */
export const expandPermissions = (granted: unknown): PermissionKey[] => {
  const effective = new Set<PermissionKey>();
  const list = Array.isArray(granted) ? granted : [];
  for (const key of list) {
    if (!isPermissionKey(key)) continue;
    effective.add(key);
    (IMPLIED_PERMISSIONS[key] || []).forEach((implied) => effective.add(implied));
  }
  return [...effective];
};

/** Which permission a staff member needs to receive each push notification. Events not listed are owner-only. */
export const PUSH_EVENT_PERMISSION: Record<string, PermissionKey> = {
  orderPlaced: "orders.view",
  offlineSaleRecorded: "sales.view",
  walletFunded: "wallet.view",
  payoutAlert: "wallet.view",
  lowStock: "products.view",
};
