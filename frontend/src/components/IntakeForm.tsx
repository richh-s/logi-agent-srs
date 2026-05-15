"use client";

import { useState } from "react";
import { createShipment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function IntakeForm({ onShipmentAdded }: { onShipmentAdded: () => void }) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courier, setCourier] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber || !courier) return;
    setLoading(true);
    try {
      await createShipment(trackingNumber, courier);
      setTrackingNumber("");
      setCourier("");
      onShipmentAdded();
    } catch (error) {
      console.error("Failed to add shipment", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Shipment</CardTitle>
        <CardDescription>Enter tracking details to monitor.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Input
            placeholder="Tracking Number (e.g. ABC123)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            required
            className="flex-1"
          />
          <Input
            placeholder="Courier (e.g. fedex)"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
