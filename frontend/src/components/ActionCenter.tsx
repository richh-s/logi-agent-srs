"use client";

import { useState } from "react";
import { updateAlertStatus } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ActionCenter({ alerts, onAlertUpdated }: { alerts: any[], onAlertUpdated: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleAction = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      await updateAlertStatus(id, status, notes[id]);
      onAlertUpdated();
      // Clear note after action
      setNotes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
                  <p className="text-gray-600 dark:text-gray-400 italic">"{alert.message}"</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Internal Annotation</p>
                  <textarea
                    placeholder="Add notes for the team..."
                    className="w-full text-xs p-2 rounded border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/20 focus:outline-none focus:ring-1 focus:ring-red-500"
                    rows={2}
                    value={notes[alert.id] || ""}
                    onChange={(e) => setNotes(prev => ({ ...prev, [alert.id]: e.target.value }))}
                  />
                </div>
                
                <div className="text-sm bg-white/80 dark:bg-black/40 p-2 rounded border border-green-200 dark:border-green-900 shadow-sm">
                  <p className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                    <span className="text-lg">💡</span> Mitigation Suggestion:
                  </p>
                  <p className="text-green-600 dark:text-green-500 mt-1">{alert.mitigation_suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
