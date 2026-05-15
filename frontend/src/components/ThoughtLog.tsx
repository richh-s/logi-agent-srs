"use client";

import { useEffect, useState } from "react";
import { getShipmentLogs } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Info, AlertTriangle, ShieldCheck, Terminal, Maximize2, Minimize2 } from "lucide-react";

// --- HELPERS & MAPPINGS ---
const CARRIER_STATUS_MAP: Record<string, string> = {
  "10": "In Transit",
  "20": "Expired",
  "30": "Not Found",
  "35": "Available for Pickup",
  "40": "Picked Up",
  "50": "Arrived at Hub / Sort Facility",
  "15011": "Pending / Info Received",
};

const getStatusText = (code: any) => {
  if (!code) return "Unknown Status";
  const codeStr = String(code);
  return CARRIER_STATUS_MAP[codeStr] || `Status ${codeStr}`;
};

const getRiskColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case "high": return "text-red-600 border-red-100 bg-red-50";
    case "medium": return "text-amber-600 border-amber-100 bg-amber-50";
    case "low": return "text-emerald-600 border-emerald-100 bg-emerald-50";
    default: return "text-slate-600 border-slate-100 bg-slate-50";
  }
};

const getRiskBadge = (level: string) => {
  switch (level?.toLowerCase()) {
    case "high": return "bg-red-500 text-white";
    case "medium": return "bg-amber-500 text-white";
    case "low": return "bg-emerald-500 text-white";
    default: return "bg-slate-500 text-white";
  }
};

export function ThoughtLog({ activeShipmentId }: { activeShipmentId: string | null }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [devView, setDevView] = useState<Record<string, boolean>>({});
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    // Escape key to exit full screen
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

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const parseLog = (log: any) => {
    let parsed: any = { raw: log.reasoning };
    
    // Try parsing as JSON (17TRACK response)
    try {
      if (log.reasoning.startsWith("{")) {
        const json = JSON.parse(log.reasoning);
        parsed.isJson = true;
        
        // Extract 17TRACK info
        const data = json.data || {};
        const accepted = data.accepted?.[0] || {};
        const trackInfo = accepted.track_info || {};
        const latestStatus = trackInfo.latest_status || {};
        const shippingInfo = trackInfo.shipping_info || {};
        
        parsed.status = getStatusText(latestStatus.status || json.status_code);
        parsed.location = json.simulated_route 
          ? json.simulated_route.split("→")[0].trim() 
          : `${shippingInfo.shipper_address?.city || ""}, ${shippingInfo.shipper_address?.state || ""}`.trim();
        
        if (parsed.location === ",") parsed.location = "Unknown Hub";
      } else {
        // AI Reasoning Trace
        parsed.isAiReasoning = true;
        
        // Try to extract risk level from reasoning trace
        const riskMatch = log.reasoning.match(/Risk Level:\s*(\w+)/i);
        parsed.riskLevel = riskMatch ? riskMatch[1] : null;
        
        // Extract a "Summary" line if possible
        const lines = log.reasoning.split("\n").filter((l: string) => l.trim().length > 0);
        parsed.summary = lines[0];
      }
    } catch (e) {
      parsed.isJson = false;
    }
    
    return parsed;
  };

  return (
    <div className={isFullScreen ? "fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center animate-in fade-in duration-300" : "h-full"}>
      <Card className={`h-full border-none bg-white flex flex-col overflow-hidden shadow-none transition-all duration-500 ${
        isFullScreen ? "w-full max-w-6xl h-full max-h-[90vh] rounded-[2rem] shadow-2xl" : ""
      }`}>
        <CardHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
                Core Reasoning Log
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400 uppercase mt-1 font-bold flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                Neural Trace Protocol v1.5
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <span className="text-[10px] font-mono text-slate-500 font-bold tracking-tighter">
                {activeShipmentId ? `ID: ${activeShipmentId.slice(0, 8)}` : "OFFLINE"}
              </span>
            </div>
            <button 
              onClick={toggleFullScreen}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-blue-600"
              title={isFullScreen ? "Minimize" : "Maximize"}
            >
              {isFullScreen ? (
                <div className="flex items-center gap-2 px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest">Exit Full Screen</span>
                  <Minimize2 className="w-4 h-4" />
                </div>
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-8 font-sans">
              {logs.length === 0 && !loading && (
                <div className="h-60 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <Info className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-300">
                    Awaiting Neural Link...
                  </p>
                  <p className="text-[9px] text-slate-400 mt-2 max-w-[200px] font-medium leading-relaxed">
                    Select a shipment node from the overview to initiate a forensic trace.
                  </p>
                </div>
              )}
              
              <div className="relative border-l-2 border-slate-100 ml-2 pl-6 space-y-10">
                {logs.map((log, i) => {
                  const parsed = parseLog(log);
                  const isHighRisk = parsed.riskLevel?.toLowerCase() === "high";

                  return (
                    <div key={log.id} className="relative animate-in fade-in slide-in-from-left-4 duration-700">
                      {/* Timeline Node */}
                      <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                        parsed.isAiReasoning ? "bg-blue-600 scale-125" : "bg-slate-200"
                      } shadow-sm z-10`} />
                      
                      {/* Timestamp & Label */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            parsed.isAiReasoning ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 text-slate-500"
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* --- CLEAN SUMMARY VIEW --- */}
                        {parsed.isJson && (
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div>
                              <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Geographic Hub</p>
                              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                {parsed.location || "In Transit"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Carrier Status</p>
                              <p className="text-xs font-bold text-slate-700">
                                {parsed.status}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* --- AI RISK LOGIC CALLOUT --- */}
                        {parsed.isAiReasoning && (
                          <div className={`p-4 rounded-2xl border-2 ${getRiskColor(parsed.riskLevel)}`}>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                {isHighRisk ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                Judge Agent Analysis
                              </h4>
                              {parsed.riskLevel && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getRiskBadge(parsed.riskLevel)}`}>
                                  {parsed.riskLevel} Risk
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-medium leading-relaxed italic whitespace-pre-wrap">
                              "{log.reasoning}"
                            </div>
                          </div>
                        )}

                        {/* --- DEVELOPER VIEW --- */}
                        {parsed.isJson && (
                          <div className="mt-2">
                            <button 
                              onClick={() => toggleDevView(log.id)}
                              className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              {devView[log.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              Developer View (Raw JSON)
                            </button>
                            
                            {devView[log.id] && (
                              <div className="mt-2 p-3 bg-slate-900 rounded-xl overflow-x-auto">
                                <pre className="text-[9px] text-emerald-400 font-mono leading-tight">
                                  {parsed.raw}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {loading && (
                <div className="flex items-center gap-3 text-blue-500 animate-pulse pl-8">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                  </div>
                  <span className="uppercase tracking-[0.2em] text-[9px] font-black">Syncing neural stream...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        {/* TRACEABILITY FOOTER */}
        <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-50">
          <div className="flex justify-between items-center opacity-40">
            <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Node Trace: {activeShipmentId || "NONE"}
            </span>
            <span className="text-[8px] font-mono font-bold text-slate-400">
              {isFullScreen ? "FULL SCREEN MODE ENABLED" : "STANDARD VIEW"} &copy; 2026 LOGI-AGENT SYSTEM
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
