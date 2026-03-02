"use client";

import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/dashboard/page-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [operatorName, setOperatorName] = useState("TapTapToGo Control Room");
  const [defaultTopUp, setDefaultTopUp] = useState("100");

  const handleSave = () => {
    toast.success("Settings saved for this session.");
  };

  return (
    <PageShell
      title="Settings"
      description="Configure dashboard behavior and appearance for operations staff."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Switch between light and dark mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>
              Basic operator preferences and defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={operatorName}
              onChange={(event) => setOperatorName(event.target.value)}
              placeholder="Operator display name"
            />
            <Input
              type="number"
              min={1}
              value={defaultTopUp}
              onChange={(event) => setDefaultTopUp(event.target.value)}
              placeholder="Default top-up amount"
            />
            <Button onClick={handleSave} className="w-full">
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
