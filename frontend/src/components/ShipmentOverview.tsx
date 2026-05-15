"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

export function ShipmentOverview({ 
  shipments, 
  activeId, 
  onSyncShipment, 
  onDeleteShipment,
  onSelectShipment
}: { 
  shipments: any[], 
  activeId: string | null,
  onSyncShipment: (id: string) => Promise<void>,
  onDeleteShipment: (id: string) => Promise<void>,
  onSelectShipment: (id: string) => void
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSync = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLoadingId(id);
    try {
      await onSyncShipment(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this shipment?")) {
      await onDeleteShipment(id);
    }
  };

  const parseLocation = (locStr: string) => {
    if (!locStr) return { origin: "Pending", dest: "Resolving..." };
    const parts = locStr.split("➔").map(p => p.trim());
    return {
      origin: parts[0] || "Pending",
      dest: parts[1] || "Resolving..."
    };
  };

  return (
    <Card className="h-full border-none bg-transparent flex flex-col shadow-none">
      <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900">Live Inventory Monitor</CardTitle>
          <CardDescription className="text-xs text-slate-500 uppercase tracking-tighter font-extrabold">Real-time status tracking</CardDescription>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-none shadow-none font-bold">
          {shipments.length} Units Active
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto px-0 pb-0">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase px-6">ID / Tracking</TableHead>
              <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase">Route Context</TableHead>
              <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase">Status</TableHead>
              <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase">Risk Index</TableHead>
              <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase text-center">Sync</TableHead>
              <TableHead className="text-[10px] font-extrabold text-slate-500 uppercase px-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.length === 0 && (
              <TableRow className="border-none">
                <TableCell colSpan={6} className="text-center font-bold text-slate-500 py-12">
                  No tracking objects detected.
                </TableCell>
              </TableRow>
            )}
            {shipments.map((shipment) => {
              const { origin, dest } = parseLocation(shipment.current_location);
              return (
                <TableRow 
                  key={shipment.id} 
                  onClick={() => onSelectShipment(shipment.id)}
                  className={`border-none transition-colors cursor-pointer group ${
                    activeId === shipment.id ? "bg-blue-50/50 border-l-2 border-l-blue-500" : "hover:bg-slate-50/50"
                  }`}
                >
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {shipment.tracking_number}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">ID: {shipment.id.slice(0, 8)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-left">
                      <div className="flex flex-col min-w-[80px]">
                        <span className="text-[10px] text-slate-500 uppercase font-extrabold">Origin</span>
                        <span className="text-xs text-slate-800 font-bold truncate max-w-[100px] mt-0.5">{origin}</span>
                      </div>
                      <div className="flex flex-col items-center px-2">
                         <span className="text-xs text-slate-400 font-bold">➔</span>
                      </div>
                      <div className="flex flex-col min-w-[80px]">
                        <span className="text-[10px] text-slate-500 uppercase font-extrabold">Dest</span>
                        <span className="text-xs text-blue-700 font-extrabold truncate max-w-[100px] mt-0.5">{dest}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-left">
                      <div className={`w-2 h-2 rounded-full ${
                        shipment.status === "Delivered" ? "bg-green-500" : 
                        shipment.status === "Pending" ? "bg-slate-400" : "bg-blue-600 animate-pulse"
                      }`} />
                      <span className="text-xs font-bold text-slate-800">{shipment.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`text-[10px] font-extrabold px-2 py-0 h-5 border-none shadow-none ${
                        shipment.current_risk_level === "High" 
                          ? "bg-red-50 text-red-700" 
                          : shipment.current_risk_level === "Medium"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {shipment.current_risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                     <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 text-slate-500 hover:text-blue-700 hover:bg-blue-50 ${loadingId === shipment.id ? "animate-spin" : ""}`}
                      onClick={(e) => handleSync(e, shipment.id)}
                      disabled={loadingId === shipment.id}
                     >
                       <RefreshCw className="h-4 w-4" />
                     </Button>
                  </TableCell>
                  <TableCell className="px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[10px] font-bold font-mono text-slate-500 mr-2">
                        {shipment.last_checked_at
                          ? new Date(shipment.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "N/A"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                        onClick={(e) => handleDelete(e, shipment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
