export type DashboardNavItem = {
  href: string;
  title: string;
  description: string;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/",
    title: "Dashboard",
    description: "Overview of system activity and health",
  },
  {
    href: "/card-management",
    title: "Card Management",
    description: "Register and monitor NFC cards",
  },
  {
    href: "/ticket-shop",
    title: "Ticket Shop",
    description: "Sell tickets and review pricing",
  },
  {
    href: "/transactions",
    title: "Transactions",
    description: "Filter logs and review totals",
  },
  {
    href: "/transit-simulator",
    title: "Transit Simulator",
    description: "Simulate tap-in and tap-out lifecycle",
  },
  {
    href: "/top-up-expiry",
    title: "Top-Up & Expiry",
    description: "Manage balance and card validity",
  },
  {
    href: "/settings",
    title: "Settings",
    description: "System configuration and theme",
  },
];

export function getCurrentNavItem(pathname: string) {
  if (pathname === "/") {
    return dashboardNavItems[0];
  }

  const matched = dashboardNavItems.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );

  return matched ?? dashboardNavItems[0];
}
