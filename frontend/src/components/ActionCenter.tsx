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
    <Card className="h-full border-none bg-transparent flex flex-col shadow-none">
      <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Critical Exceptions
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Manual Resolution Required</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden px-4 pb-4">
        <ScrollArea className="h-full pr-4">
          <div className="flex flex-col gap-4 mt-4">
            {activeAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 opacity-30 text-center">
                <span className="text-4xl mb-2 text-slate-900">🛡️</span>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-900">System Perimeter Secure<br/>No Active Breaches</p>
              </div>
            )}
            {activeAlerts.map(alert => (
              <div key={alert.id} className="relative overflow-hidden rounded-2xl bg-slate-50/50 p-5 space-y-4">
                {/* Status Bar */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 font-mono tracking-tighter">{alert.tracking_number}</h4>
                      <div className="px-1.5 py-0.5 bg-red-600 text-[9px] font-bold text-white rounded uppercase">
                        {alert.estimated_delay_hours || "High Risk"}
                      </div>
                    </div>
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Risk Level: {alert.risk_level}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-900 border-none shadow-sm"
                      onClick={() => handleAction(alert.id, "Acknowledged")}
                      disabled={loadingId === alert.id}
                    >
                      ACK
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 text-[10px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => handleAction(alert.id, "Dismissed")}
                      disabled={loadingId === alert.id}
                    >
                      EXIT
                    </Button>
                  </div>
                </div>
                
                {/* Reasoning Trace */}
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-tighter text-left">AI Reasoning Trace</p>
                  <p className="text-xs text-slate-600 leading-relaxed italic font-serif text-left">"{alert.message}"</p>
                </div>

                {/* Mitigation */}
                <div className="flex items-start gap-3 bg-emerald-50 rounded-lg p-3 text-left">
                  <span className="text-sm">💡</span>
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest">Mitigation Protocol</p>
                    <p className="text-xs text-emerald-900/80 leading-snug font-medium">{alert.mitigation_suggestion}</p>
                  </div>
                </div>

                {/* Annotation Area */}
                <div className="space-y-2 pt-2">
                   <div className="flex justify-between items-center text-left">
                     <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Internal Annotation</p>
                   </div>
                   <textarea
                    placeholder="Log manual intervention steps..."
                    className="w-full text-xs p-3 rounded-xl border-none bg-white text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-red-100 transition-all resize-none shadow-sm"
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
