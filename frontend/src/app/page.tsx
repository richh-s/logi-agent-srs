"use client";

import { useEffect, useState } from "react";
import { getShipments, getAlerts, runOrchestrator } from "@/lib/api";
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

  const handleRunOrchestrator = async () => {
    setOrchestratorRunning(true);
    try {
      await runOrchestrator();
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to run orchestrator", error);
    } finally {
      setOrchestratorRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Logistics Operations Agent
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Autonomous transit monitoring and risk mitigation.
            </p>
          </div>
          <Button 
            onClick={handleRunOrchestrator} 
            disabled={orchestratorRunning}
            className="shadow-sm"
          >
            <Play className="w-4 h-4 mr-2" />
            {orchestratorRunning ? "Running Cycle..." : "Trigger Orchestrator"}
          </Button>
        </div>

        {/* Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1">
            <IntakeForm onShipmentAdded={fetchDashboardData} />
          </div>
          <div className="col-span-1 lg:col-span-2">
            <ActionCenter alerts={alerts} onAlertUpdated={fetchDashboardData} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          <div className="col-span-1 lg:col-span-2">
            {/* Click to select a shipment for logs */}
            <div onClick={(e) => {
              const row = (e.target as HTMLElement).closest('tr');
              if (row && shipments.length > 0) {
                const index = Array.from(row.parentNode?.children || []).indexOf(row) - 1; // -1 for header row
                if (index >= 0 && shipments[index]) {
                  setActiveShipmentId(shipments[index].id);
                }
              }
            }}>
              <ShipmentOverview shipments={shipments} />
            </div>
          </div>
          <div className="col-span-1 h-full">
            <ThoughtLog activeShipmentId={activeShipmentId} />
          </div>
        </div>

      </div>
    </div>
  );
}
