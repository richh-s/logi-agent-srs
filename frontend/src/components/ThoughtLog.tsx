"use client";

import { useEffect, useState } from "react";
import { getShipmentLogs } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Info, AlertTriangle, ShieldCheck, Terminal, Maximize2, Minimize2, MapPin, CloudSun, Scale } from "lucide-react";

// --- HELPERS & MAPPINGS ---
const CARRIER_STATUS_MAP: Record<string, string> = {
  "301": "In Transit",
  "401": "Delivered",
  "15011": "Info Received / Processing at Origin",
};

const getStatusText = (code: any) => {
  if (!code) return "Syncing Tracking Data...";
  const codeStr = String(code);
  return CARRIER_STATUS_MAP[codeStr] || "Syncing Tracking Data...";
};

const getRiskColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case "high": return "text-red-700 border-red-200 bg-red-50";
    case "medium": return "text-amber-700 border-amber-200 bg-amber-50";
    case "low": return "text-emerald-700 border-emerald-200 bg-emerald-50";
    default: return "text-slate-700 border-slate-200 bg-slate-50";
  }
};

const getRiskBadge = (level: string) => {
  switch (level?.toLowerCase()) {
    case "high": return "bg-red-600 text-white";
    case "medium": return "bg-amber-600 text-white";
    case "low": return "bg-emerald-600 text-white";
    default: return "bg-slate-600 text-white";
  }
};

const cleanText = (text: string) => {
  if (!text) return "";
  return text
    .replace(/\\u2014/g, "—")
    .replace(/\\u2192/g, "→")
    .replace(/\u2014/g, "—")
    .replace(/\u2192/g, "→");
};

const formatBullets = (text: string) => {
  if (!text) return null;
  const lines = text.split(". ").filter(l => l.trim().length > 0);
  if (lines.length <= 1) return text;
  return (
    <ul className="list-disc ml-5 space-y-2 mt-2">
      {lines.map((line, i) => (
        <li key={i} className="pl-1">{line.trim()}{line.endsWith('.') ? '' : '.'}</li>
      ))}
    </ul>
  );
};

export function ThoughtLog({ activeShipmentId }: { activeShipmentId: string | null }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [devView, setDevView] = useState<Record<string, boolean>>({});
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullScreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

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

  const toggleDevView = (id: string) => {
    setDevView(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  const parseLog = (log: any) => {
    let parsed: any = { raw: log.reasoning };
    
    try {
      if (log.reasoning.startsWith("{")) {
        const json = JSON.parse(log.reasoning);
        parsed.isJson = true;
        
        const data = json.data || {};
        const accepted = data.accepted?.[0] || {};
        const trackInfo = accepted.track_info || {};
        const latestStatus = trackInfo.latest_status || {};
        const shippingInfo = trackInfo.shipping_info || {};
        
        parsed.status = getStatusText(latestStatus.status || json.status_code);
        parsed.location = json.simulated_route 
          ? json.simulated_route.split("→")[0].trim() 
          : `${shippingInfo.shipper_address?.city || ""}, ${shippingInfo.shipper_address?.state || ""}`.trim();
        
        if (parsed.location === ",") parsed.location = "Syncing Hub...";
        parsed.weather = json.current_weather || "Syncing Weather...";
      } else {
        parsed.isAiReasoning = true;
        const riskMatch = log.reasoning.match(/Risk Level:\s*(\w+)/i);
        parsed.riskLevel = riskMatch ? riskMatch[1] : null;
      }
    } catch (e) {
      parsed.isJson = false;
    }
    
    return parsed;
  };

  return (
    <div className={isFullScreen ? "fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md p-4 md:p-12 flex items-center justify-center animate-in fade-in duration-300" : "h-full"}>
      <Card className={`h-full border-none bg-white flex flex-col overflow-hidden shadow-none transition-all duration-500 ${
        isFullScreen ? "w-full max-w-6xl h-full max-h-[90vh] rounded-3xl shadow-2xl" : ""
      }`}>
        <CardHeader className="px-8 py-5 flex flex-row items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className={`text-base font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide ${loading ? 'animate-pulse' : ''}`}>
                <div className={`h-3 w-3 rounded-full bg-blue-600 ${loading ? 'animate-ping' : ''} shadow-[0_0_10px_rgba(37,99,235,0.4)]`} />
                Core Reasoning Log
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                Audit Trace Protocol v1.5
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleFullScreen}
              className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-blue-600"
              title="Toggle Full Screen"
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="p-8 space-y-10 font-sans">
              {logs.length === 0 && !loading && (
                <div className="h-64 flex flex-col items-center justify-center text-center opacity-40">
                  <Info className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="text-sm uppercase tracking-widest font-bold text-slate-400">Awaiting Data Connection...</p>
                </div>
              )}
              
              <div className="relative border-l-2 border-slate-100 ml-3 pl-8 space-y-12">
                {logs.map((log, i) => {
                  const parsed = parseLog(log);
                  const isHighRisk = parsed.riskLevel?.toLowerCase() === "high";
                  
                  let displayAction = log.action;
                  if (displayAction === "Data Retrieval Error" || displayAction.includes("Error")) {
                    displayAction = "🔄 Awaiting Hub Location Data";
                  }

                  return (
                    <div key={log.id} className="relative animate-in fade-in slide-in-from-left-4 duration-700">
                      <div className={`absolute -left-[39px] top-1 w-5 h-5 rounded-full border-2 border-white ${
                        parsed.isAiReasoning ? "bg-blue-600 scale-110 shadow-lg" : "bg-slate-200"
                      } z-10`} />
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                            parsed.isAiReasoning ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          } ${displayAction.includes("🔄") ? "bg-amber-100 text-amber-700" : ""}`}>
                            {displayAction}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {(parsed.isJson || parsed.riskLevel) && (
                          <div className="flex flex-wrap items-center gap-5 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-50 pb-3">
                            <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500"/> {parsed.location || "Syncing..."}</span>
                            <span className="text-slate-200">|</span>
                            <span className="flex items-center gap-2"><CloudSun className="w-4 h-4 text-amber-500"/> {parsed.weather || "Syncing..."}</span>
                            <span className="text-slate-200">|</span>
                            <span className="flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-500"/> {parsed.riskLevel || "Pending"}</span>
                          </div>
                        )}

                        {parsed.isJson && (
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">Carrier Status</p>
                            <p className="text-sm font-semibold text-slate-800">{parsed.status}</p>
                          </div>
                        )}

                        {parsed.isAiReasoning && (
                          <div className={`p-6 rounded-2xl border ${getRiskColor(parsed.riskLevel)}`}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                {isHighRisk ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                Agent Reasoning Trace
                              </h4>
                              {parsed.riskLevel && (
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getRiskBadge(parsed.riskLevel)}`}>
                                  {parsed.riskLevel} Risk
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-medium leading-relaxed text-slate-800">
                              {formatBullets(cleanText(log.reasoning))}
                            </div>
                          </div>
                        )}

                        {parsed.isJson && (
                          <div className="mt-3">
                            <button onClick={() => toggleDevView(log.id)} className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400 hover:text-blue-600 transition-colors">
                              {devView[log.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              Developer View (Raw API Response)
                            </button>
                            {devView[log.id] && (
                              <div className="mt-3 p-4 bg-slate-900 rounded-xl overflow-x-auto shadow-inner">
                                <pre className="text-xs text-emerald-400 font-mono leading-relaxed">{cleanText(parsed.raw)}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </CardContent>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center opacity-60">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">Node Trace ID: {activeShipmentId || "NONE"}</span>
          <span className="text-[10px] font-mono font-bold text-slate-500">&copy; 2026 LOGI-AGENT SYSTEM</span>
        </div>
      </Card>
    </div>
  );
}
