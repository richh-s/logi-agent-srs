import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getShipments = async () => {
  const response = await api.get("/shipments/");
  return response.data;
};

export const createShipment = async (trackingNumber: string, courier: string) => {
  const response = await api.post("/shipments/", { tracking_number: trackingNumber, courier });
  return response.data;
};

export const manualOverrideShipment = async (shipmentId: string, status: string) => {
  const response = await api.post(`/shipments/${shipmentId}/action`, null, {
    params: { status }
  });
  return response.data;
};

export const getShipmentLogs = async (shipmentId: string) => {
  const response = await api.get(`/logs/${shipmentId}`);
  return response.data;
};

export const getAlerts = async () => {
  const response = await api.get("/alerts/");
  return response.data;
};

export const updateAlertStatus = async (alertId: string, status: string) => {
  const response = await api.post(`/alerts/${alertId}/action`, null, {
    params: { status }
  });
  return response.data;
};

export const runOrchestrator = async () => {
  const response = await api.post("/orchestrator/run");
  return response.data;
};
