"use client";

import { useState } from "react";
import { updateAlertStatus } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ActionCenter({ alerts, onAlertUpdated }: { alerts: any[], onAlertUpdated: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      await updateAlertStatus(id, status);
      onAlertUpdated();
    } catch (error) {
      console.error("Failed to update alert", error);
    } finally {
      setLoadingId(null);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === "Active");

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Action Center</CardTitle>
        <CardDescription>High risk events requiring manual review.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="flex flex-col gap-4">
            {activeAlerts.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">No active alerts</p>
            )}
            {activeAlerts.map(alert => (
              <div key={alert.id} className="border rounded-lg p-4 bg-red-50/50 dark:bg-red-950/10 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{alert.tracking_number}</h4>
                    <Badge variant="destructive" className="mt-1">High Risk ({alert.delay_probability}% Delay)</Badge>
                  </div>
                  <div className="space-x-2 flex">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleAction(alert.id, "Acknowledged")}
                      disabled={loadingId === alert.id}
                    >
                      Ack
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleAction(alert.id, "Dismissed")}
                      disabled={loadingId === alert.id}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Reasoning:</p>
                  <p className="text-gray-600 dark:text-gray-400">{alert.message}</p>
                </div>
                
                <div className="text-sm bg-white dark:bg-black/20 p-2 rounded border border-green-200 dark:border-green-900">
                  <p className="font-semibold text-green-700 dark:text-green-400">Mitigation Suggestion:</p>
                  <p className="text-green-600 dark:text-green-500">{alert.mitigation_suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
