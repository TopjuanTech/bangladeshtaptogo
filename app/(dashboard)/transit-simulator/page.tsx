import { PageShell } from "@/components/dashboard/page-shell";
import { TransitSimulator } from "@/components/transit-simulator";

export default function TransitSimulatorPage() {
  return (
    <PageShell
      title="Transit Simulator"
      description="Run full tap-in / tap-out lifecycle tests against the fare matrix and card rules."
    >
      <TransitSimulator />
    </PageShell>
  );
}
