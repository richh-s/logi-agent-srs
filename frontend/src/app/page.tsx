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
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 font-sans">
      <div className="max-w-[1600px] mx-auto p-4 md:p-10 space-y-8">
        
        {/* Professional Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-10 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-5xl font-black tracking-tight text-slate-900">
                LOGI<span className="text-blue-600">AGENT</span>
              </h1>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span> 
                  Gemini 1.5 Flash
                </span>
                <span className="w-px h-4 bg-slate-300"></span>
                <span className="text-blue-600">Supabase Connected</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-xs text-slate-400 uppercase font-black tracking-[0.2em] mb-1">Network Status</span>
              <span className="text-lg font-mono font-bold text-slate-700">OPTIMAL</span>
            </div>
            <Button 
              onClick={() => handleRunOrchestrator()} 
              disabled={orchestratorRunning}
              className={`px-12 h-16 rounded-[1.5rem] font-black transition-all text-sm uppercase tracking-[0.2em] shadow-2xl ${
                orchestratorRunning 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30"
              }`}
            >
              {orchestratorRunning ? (
                <span className="flex items-center gap-4">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  Syncing...
                </span>
              ) : (
                <span className="flex items-center gap-4">
                  <Play className="w-5 h-5 fill-current" />
                  Initiate Cycle
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Main Dashboard Grid */}
        <main className="grid grid-cols-12 gap-8">
          
          {/* Left Column: Intake & Action Center */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 overflow-hidden">
              <IntakeForm onShipmentAdded={fetchDashboardData} />
            </div>
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 h-[calc(100vh-500px)] min-h-[450px] overflow-hidden">
              <ActionCenter alerts={alerts} onAlertUpdated={fetchDashboardData} />
            </div>
          </div>

          {/* Right Column: Overview & Intelligence */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 h-[500px] overflow-hidden">
              <ShipmentOverview 
                shipments={shipments} 
                activeId={activeShipmentId} 
                onSyncShipment={handleRunOrchestrator}
                onDeleteShipment={handleDeleteShipment}
                onSelectShipment={setActiveShipmentId}
              />
            </div>
            
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 h-[calc(100vh-750px)] min-h-[350px] overflow-hidden">
              <ThoughtLog activeShipmentId={activeShipmentId} />
            </div>
          </div>

        </main>

        <footer className="pt-10 pb-6 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em]">
            Autonomous Logistics Intelligence System &copy; 2026 
          </p>
        </footer>

      </div>
    </div>
  );
}
