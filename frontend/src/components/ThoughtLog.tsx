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
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [activeShipmentId]);

  return (
    <Card className="h-full border-none bg-white flex flex-col overflow-hidden shadow-none">
      <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
            Core Reasoning Log
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-400 uppercase mt-1 font-semibold">
            {activeShipmentId ? `Tracing ID: ${activeShipmentId.slice(0, 12)}...` : "Select node to initiate trace"}
          </CardDescription>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-100"></div>
          <div className="w-2 h-2 rounded-full bg-slate-100"></div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6 font-mono text-[11px]">
            {logs.length === 0 && !loading && (
              <div className="h-40 flex flex-col items-center justify-center opacity-20 text-center text-slate-900">
                <span className="text-2xl mb-2">👁️‍🗨️</span>
                <p className="uppercase tracking-widest">Awaiting Neural Link...</p>
              </div>
            )}
            
            {logs.map((log, i) => (
              <div key={log.id} className="relative pl-6 group animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-100 group-hover:bg-blue-500 transition-colors" />
                
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                    {log.action}
                  </span>
                  <span className="text-slate-400 font-bold tracking-tighter">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl group-hover:bg-blue-50/50 transition-colors text-left">
                  {log.reasoning}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex items-center gap-2 text-blue-400 animate-pulse pl-6">
                <span className="w-1 h-4 bg-blue-400 rounded-full animate-bounce"></span>
                <span className="uppercase tracking-widest text-[9px] font-bold">Fetching latest intelligence...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
