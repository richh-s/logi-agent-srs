"use client";

import { useEffect, useState } from "react";
import { getShipmentLogs } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ThoughtLog({ activeShipmentId }: { activeShipmentId: string | null }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeShipmentId) {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await getShipmentLogs(activeShipmentId);
        setLogs(data.logs || []);
      } catch (error) {
        console.error("Failed to fetch logs", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    
    // Poll every 5 seconds for live feed
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [activeShipmentId]);

  return (
    <Card className="h-full flex flex-col bg-slate-950 text-slate-50 border-slate-800">
      <CardHeader className="border-b border-slate-800 pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Agent Thought Log
        </CardTitle>
        <CardDescription className="text-slate-400">
          {activeShipmentId ? `Live reasoning traces for ${activeShipmentId}` : "Select a shipment to view logs"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          <div className="flex flex-col gap-4 font-mono text-xs">
            {loading && logs.length === 0 && <div className="text-slate-500">Loading traces...</div>}
            {!loading && logs.length === 0 && activeShipmentId && (
              <div className="text-slate-500">No traces available for this shipment.</div>
            )}
            
            {logs.map((log) => (
              <div key={log.id} className="border-l-2 border-slate-700 pl-3 py-1 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="text-blue-400">{log.action}</span>
                </div>
                <div className="text-slate-300 leading-relaxed">
                  {log.reasoning}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
