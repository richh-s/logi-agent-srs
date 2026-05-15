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

export function ShipmentOverview({ shipments }: { shipments: any[] }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Shipment Overview</CardTitle>
        <CardDescription>Active shipments being monitored.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Last Notified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No active shipments
                </TableCell>
              </TableRow>
            )}
            {shipments.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell className="font-medium">{shipment.tracking_number}</TableCell>
                <TableCell>{shipment.status}</TableCell>
                <TableCell>
                  <Badge variant={shipment.current_risk_level === "High" ? "destructive" : shipment.current_risk_level === "Medium" ? "outline" : "secondary"}>
                    {shipment.current_risk_level}
                  </Badge>
                </TableCell>
                <TableCell>
                  {shipment.last_notified_at
                    ? new Date(shipment.last_notified_at).toLocaleString()
                    : "Never"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
