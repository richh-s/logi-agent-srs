"use client";

import { useState, useEffect } from "react";
import { updateAlertStatus } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, Zap, ArrowUpRight, Maximize2, Minimize2 } from "lucide-react";

export function ActionCenter({ alerts, onAlertUpdated }: { alerts: any[], onAlertUpdated: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullScreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

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
    <div className={isFullScreen ? "fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md p-4 md:p-12 flex items-center justify-center animate-in fade-in duration-300" : "h-full"}>
      <Card className={`h-full border-none bg-slate-50 flex flex-col shadow-none overflow-hidden transition-all duration-500 ${
        isFullScreen ? "w-full max-w-4xl h-full max-h-[90vh] rounded-3xl shadow-2xl bg-white" : ""
      }`}>
        <CardHeader className="px-6 py-5 flex flex-row items-center justify-between border-b border-slate-200 bg-white shadow-sm">
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" />
              Critical Exceptions
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 font-extrabold mt-1">Manual Resolution Required</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-full">
              <Zap className="w-3.5 h-3.5 text-red-600 fill-current" />
              <span className="text-xs font-extrabold text-red-700">{activeAlerts.length}</span>
            </div>
            <button 
              onClick={toggleFullScreen}
              className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-blue-600"
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="p-5 space-y-6">
              {activeAlerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 opacity-40 text-center">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-5">
                    <ShieldAlert className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-sm font-extrabold uppercase tracking-widest text-slate-900">Perimeter Secure</p>
                  <p className="text-xs text-slate-600 font-bold mt-2">No active breaches detected</p>
                </div>
              )}
              
              {activeAlerts.map(alert => (
                <div key={alert.id} className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md transition-all hover:shadow-xl p-6">
                  <div className="flex justify-between items-start mb-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-extrabold text-slate-900 font-mono tracking-tight uppercase">{alert.tracking_number}</h4>
                        <div className="px-3 py-1 bg-red-600 text-[10px] font-extrabold text-white rounded-full uppercase shadow-md shadow-red-200">
                          {alert.estimated_delay_hours || "High Risk"}
                        </div>
                      </div>
                      <p className="text-xs text-red-600 font-extrabold uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                        Action Required
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAction(alert.id, "Acknowledged")}
                        disabled={loadingId === alert.id}
                        className="h-9 px-4 bg-slate-900 hover:bg-black text-[11px] font-extrabold text-white rounded-lg"
                      >
                        APPROVE
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAction(alert.id, "Dismissed")}
                        disabled={loadingId === alert.id}
                        className="h-9 px-4 text-[11px] font-extrabold text-slate-700 hover:text-red-600 border-slate-200 rounded-lg"
                      >
                        DISMISS
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left mb-4">
                    <p className="text-[10px] text-slate-600 uppercase font-extrabold mb-2 tracking-wide flex items-center gap-2">
                      <Zap className="w-3 h-3 text-blue-500" />
                      Agent Insight
                    </p>
                    <p className="text-sm text-slate-800 leading-relaxed font-semibold">"{alert.message}"</p>
                  </div>
  
                  <div className="flex items-start gap-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-left">
                    <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-800 uppercase font-extrabold tracking-widest">Protocol Suggestion</p>
                      <p className="text-sm text-emerald-950 leading-snug font-bold mt-1">{alert.mitigation_suggestion}</p>
                    </div>
                  </div>
  
                  <div className="mt-5 pt-4 border-t border-slate-100">
                     <textarea
                      placeholder="Log manual intervention steps..."
                      className="w-full text-sm font-medium p-4 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none shadow-sm"
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
    </div>
  );
}
