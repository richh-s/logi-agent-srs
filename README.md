# AI Logistics Operations Agent 🚚💨

An autonomous system designed to transform reactive shipment tracking into proactive environmental risk management. Built with the **Planner–Worker–Judge** orchestration pattern.

---

## 🏗️ Architecture & Flow
1.  **Planner**: Schedules sync cycles and applies **Suppression Logic** to prevent alert fatigue.
2.  **Worker**: Concurrently fetches data from **17TRACK** (Logistics) and **OpenWeatherMap** (Weather).
3.  **Judge (Gemini 1.5 Flash)**: Correlates status with environmental risks to assess delay probability and provide mitigation steps.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
# Configure .env based on .env.example
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Demo Guide: "The Memphis Storm"
To see the full pipeline in action without waiting for real-world delays:
1.  Open the dashboard at `http://localhost:3000`.
2.  Add a shipment with Tracking Number: `DEMO-STORM-001` and Courier: `demo`.
3.  Click **"Initiate Cycle"** in the header.
4.  Watch the **Core Reasoning Log**:
    *   Observe the Worker fetching weather for the hub and destination.
    *   Watch the Judge evaluate the "Severe Winter Storm" in Memphis.
    *   Verify the **High Risk** alert in the Action Center.

---

## ✅ Verification of Requirements

| Requirement | Implementation | Test Case |
| :--- | :--- | :--- |
| **FR-1: Shipment Intake** | `IntakeForm.tsx` | Manual entry via Dashboard |
| **FR-2: Shipment Tracking** | `aftership.py` / `seventeentrack.py` | Demo Mode / Real Tracking |
| **FR-3: Environmental Correlation** | `openweather.py` | Worker logic integration |
| **FR-4: Autonomous Monitoring** | `orchestrator.py` | "Initiate Cycle" trigger |
| **FR-5: Autonomous Triage** | `judge.py` (Gemini 1.5 Flash) | AI Assessment in Thought Log |
| **FR-6: Proactive Alerts** | `resend_client.py` | Email receipt via Resend |
| **FR-7: Reasoning Traceability** | `ThoughtLog.tsx` (Enhanced) | Intelligence Report View |
| **FR-8: Manual Override** | `ActionCenter.tsx` | "Acknowledge" button functionality |

---

## 🛡️ Security & Observability
- **Suppression Gate**: Prevents notification spam by bypassing alerts if the risk hasn't escalated or a 24h cooldown is active. Visible in logs as `Alert Bypassed`.
- **Intelligence Reports**: The Thought Log parses raw JSON into human-readable summaries with confidence scores and mitigation advice.
- **Environment Safety**: Sensitive keys are managed via `.env`. A `.env.example` is provided for configuration.

---

**Developed for AI Logistics Operations Agent Submission.**
