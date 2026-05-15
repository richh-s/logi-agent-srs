const logs = [
  {
    "id": "7d6df2f8-3cb1-448f-b105-b5101eb3c37c",
    "shipment_id": "065a2510-7e40-449f-a4d3-2551f6cbc2ec",
    "action": "Alert Bypassed",
    "reasoning": "Agent bypassed notification to prevent alert fatigue. Reason: Risk level unchanged or alert cooldown active.",
    "timestamp": "2026-05-15T18:41:29.245544+00:00"
  },
  {
    "id": "bba1dd54-e823-4803-a029-85b86b464582",
    "shipment_id": "065a2510-7e40-449f-a4d3-2551f6cbc2ec",
    "action": "17TRACK Raw Response",
    "reasoning": "{\"demo_mode\": true, \"simulated_route\": \"Memphis, TN \\u2794 Chicago, IL\", \"status\": \"In Transit - Arriving at Memphis Hub\", \"current_weather\": \"Severe Winter Storm\", \"dest_weather\": \"Overcast Clouds\"}",
    "timestamp": "2026-05-15T18:41:28.836452+00:00"
  }
];

const CARRIER_STATUS_MAP = {
  "301": "In Transit",
  "401": "Delivered",
  "15011": "Info Received / Processing at Origin",
};

const getStatusText = (code) => {
  if (!code) return "Syncing Tracking Data...";
  const codeStr = String(code);
  return CARRIER_STATUS_MAP[codeStr] || "Syncing Tracking Data...";
};

const parseLog = (log) => {
  let parsed = { raw: log.reasoning };
  
  try {
    if (log.reasoning && log.reasoning.startsWith("{")) {
      const json = JSON.parse(log.reasoning);
      parsed.isJson = true;
      
      const data = json.data || {};
      const accepted = data.accepted?.[0] || {};
      const trackInfo = accepted.track_info || {};
      const latestStatus = trackInfo.latest_status || {};
      
      parsed.status = getStatusText(latestStatus.status || json.status_code);
      
      const route = json.simulated_route || "";
      parsed.location = route.split(/[\u2192\u2794➔→]/)[0].trim();
      
      if (!parsed.location || parsed.location === ",") parsed.location = "Syncing Hub...";
      parsed.weather = json.current_weather || "Syncing Weather...";
    } else {
      parsed.isAiReasoning = true;
      const riskMatch = log.reasoning ? log.reasoning.match(/Risk Level:\s*(\w+)/i) : null;
      parsed.riskLevel = riskMatch ? riskMatch[1] : null;
    }
  } catch (e) {
    console.error("Error parsing", e);
    parsed.isJson = false;
  }
  
  return parsed;
};

logs.forEach((log, i) => {
  console.log(`Log ${i}:`, parseLog(log));
});
