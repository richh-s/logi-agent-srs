"use client";

import { useEffect, useState } from "react";
import { getShipments, getAlerts, runOrchestrator, deleteShipment } from "@/lib/api";
import { IntakeForm } from "@/components/IntakeForm";
import { ShipmentOverview } from "@/components/ShipmentOverview";
import { ActionCenter } from "@/components/ActionCenter";
import { ThoughtLog } from "@/components/ThoughtLog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export default function Home() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null);
  const [orchestratorRunning, setOrchestratorRunning] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [shipmentsData, alertsData] = await Promise.all([
        getShipments(),
        getAlerts()
      ]);
      setShipments(shipmentsData.shipments || []);
      setAlerts(alertsData.alerts || []);
      
      // Auto-select first shipment for logs if none selected
      if (!activeShipmentId && shipmentsData.shipments?.length > 0) {
        setActiveShipmentId(shipmentsData.shipments[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [activeShipmentId]);

  const handleRunOrchestrator = async (shipmentId?: string) => {
    if (!shipmentId) setOrchestratorRunning(true);
    try {
      await runOrchestrator(shipmentId);
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to run orchestrator", error);
    } finally {
      if (!shipmentId) setOrchestratorRunning(false);
    }
  };

  const handleDeleteShipment = async (id: string) => {
    try {
      await deleteShipment(id);
      if (activeShipmentId === id) setActiveShipmentId(null);
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to delete shipment", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* Professional Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-slate-900">
                LOGI<span className="text-blue-600">AGENT</span>
              </h1>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1"><span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span> Gemini 1.5 Flash</span>
                <span className="w-px h-2 bg-slate-200"></span>
                <span className="flex items-center gap-1">Supabase DB: Connected</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-4">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Next Scheduled Sync</span>
              <span className="text-sm font-mono text-slate-600">14:00:00 UTC</span>
            </div>
            <Button 
              onClick={() => handleRunOrchestrator()} 
              disabled={orchestratorRunning}
              className={`px-8 h-12 rounded-xl font-bold transition-all ${
                orchestratorRunning 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20"
              }`}
            >
              {orchestratorRunning ? (
                <span className="flex items-center gap-2 uppercase text-xs tracking-widest">
                  <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  Syncing...
                </span>
              ) : (
                <span className="flex items-center gap-2 uppercase text-xs tracking-widest">
                  <Play className="w-3 h-3 fill-current" />
                  Initiate Cycle
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Main Dashboard Grid */}
        <main className="grid grid-cols-12 gap-6">
          
          {/* Left Column: Intake & Action Center */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
              <IntakeForm onShipmentAdded={fetchDashboardData} />
            </div>
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 h-[calc(100vh-450px)] min-h-[400px] overflow-hidden">
              <ActionCenter alerts={alerts} onAlertUpdated={fetchDashboardData} />
            </div>
          </div>

          {/* Right Column: Overview & Intelligence */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 h-[450px] overflow-hidden">
              <ShipmentOverview 
                shipments={shipments} 
                activeId={activeShipmentId} 
                onSyncShipment={handleRunOrchestrator}
                onDeleteShipment={handleDeleteShipment}
                onSelectShipment={setActiveShipmentId}
              />
            </div>
            
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 h-[calc(100vh-650px)] min-h-[300px] overflow-hidden">
              <ThoughtLog activeShipmentId={activeShipmentId} />
            </div>
          </div>

        </main>

        <footer className="pt-8 pb-4 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">
            Autonomous Logistics Intelligence System &copy; 2026 
          </p>
        </footer>

      </div>
    </div>
  );
}
