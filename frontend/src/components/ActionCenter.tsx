"use client";

import { useState } from "react";
import { updateAlertStatus } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, Zap, ArrowUpRight } from "lucide-react";

export function ActionCenter({ alerts, onAlertUpdated }: { alerts: any[], onAlertUpdated: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleAction = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      await updateAlertStatus(id, status, notes[id]);
      onAlertUpdated();
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
    <Card className="h-full border-none bg-slate-50 flex flex-col shadow-none overflow-hidden">
      <CardHeader className="px-6 py-5 flex flex-row items-center justify-between border-b border-slate-200 bg-white shadow-sm">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
            Critical Exceptions
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 font-bold mt-1">Manual Resolution Required</CardDescription>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-full">
          <Zap className="w-3.5 h-3.5 text-red-600 fill-current" />
          <span className="text-xs font-bold text-red-700">{activeAlerts.length}</span>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-5 space-y-6">
            {activeAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 opacity-40 text-center">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-5">
                  <ShieldAlert className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-900">Perimeter Secure</p>
                <p className="text-xs text-slate-500 mt-2">No active breaches detected</p>
              </div>
            )}
            
            {activeAlerts.map(alert => (
              <div key={alert.id} className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md transition-all hover:shadow-xl p-6">
                <div className="flex justify-between items-start mb-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-slate-900 font-mono tracking-tight uppercase">{alert.tracking_number}</h4>
                      <div className="px-3 py-1 bg-red-600 text-[10px] font-bold text-white rounded-full uppercase shadow-md shadow-red-200">
                        {alert.estimated_delay_hours || "High Risk"}
                      </div>
                    </div>
                    <p className="text-xs text-red-600 font-bold uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                      Action Required
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleAction(alert.id, "Acknowledged")}
                      disabled={loadingId === alert.id}
                      className="h-9 px-4 bg-slate-900 hover:bg-black text-[11px] font-bold text-white rounded-lg"
                    >
                      APPROVE
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleAction(alert.id, "Dismissed")}
                      disabled={loadingId === alert.id}
                      className="h-9 px-4 text-[11px] font-bold text-slate-600 hover:text-red-600 border-slate-200 rounded-lg"
                    >
                      DISMISS
                    </Button>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left mb-4">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-wide flex items-center gap-2">
                    <Zap className="w-3 h-3 text-blue-500" />
                    Agent Insight
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">"{alert.message}"</p>
                </div>

                <div className="flex items-start gap-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-left">
                  <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-700 uppercase font-bold tracking-widest">Protocol Suggestion</p>
                    <p className="text-sm text-emerald-900 leading-snug font-semibold mt-1">{alert.mitigation_suggestion}</p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                   <textarea
                    placeholder="Log manual intervention steps..."
                    className="w-full text-sm p-4 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none shadow-sm"
                    rows={2}
                    value={notes[alert.id] || ""}
                    onChange={(e) => setNotes(prev => ({ ...prev, [alert.id]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
