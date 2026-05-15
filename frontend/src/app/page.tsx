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
      
      if (!activeShipmentId && shipmentsData.shipments?.length > 0) {
        setActiveShipmentId(shipmentsData.shipments[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
        
        {/* Refined Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200 mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                LOGI<span className="text-blue-600">AGENT</span>
              </h1>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> 
                  Gemini 1.5 Flash
                </span>
                <span className="w-px h-3 bg-slate-300"></span>
                <span className="text-blue-600">Supabase Connected</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Network Status</span>
              <span className="text-sm font-mono font-bold text-slate-700">OPTIMAL</span>
            </div>
            <Button 
              onClick={() => handleRunOrchestrator()} 
              disabled={orchestratorRunning}
              className={`px-8 h-12 rounded-xl font-bold transition-all text-xs uppercase tracking-widest ${
                orchestratorRunning 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20"
              }`}
            >
              {orchestratorRunning ? (
                <span className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  Syncing...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <Play className="w-4 h-4 fill-current" />
                  Initiate Cycle
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Main Dashboard Grid */}
        <main className="grid grid-cols-12 gap-6">
          
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
              <IntakeForm onShipmentAdded={fetchDashboardData} />
            </div>
            <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 h-[calc(100vh-450px)] min-h-[400px] overflow-hidden">
              <ActionCenter alerts={alerts} onAlertUpdated={fetchDashboardData} />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 h-[450px] overflow-hidden">
              <ShipmentOverview 
                shipments={shipments} 
                activeId={activeShipmentId} 
                onSyncShipment={handleRunOrchestrator}
                onDeleteShipment={handleDeleteShipment}
                onSelectShipment={setActiveShipmentId}
              />
            </div>
            
            <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 h-[calc(100vh-650px)] min-h-[300px] overflow-hidden">
              <ThoughtLog activeShipmentId={activeShipmentId} />
            </div>
          </div>

        </main>

        <footer className="pt-6 pb-4 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]">
            Autonomous Logistics Intelligence System &copy; 2026 
          </p>
        </footer>

      </div>
    </div>
  );
}
