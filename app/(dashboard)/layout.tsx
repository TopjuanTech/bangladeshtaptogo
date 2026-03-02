import { AppShell } from "@/components/dashboard/app-shell";
import { AuthGate } from "@/components/auth-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
