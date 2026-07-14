# 🌊 Billow — AWS Cost & Resource Monitor

An intuitive, flat, functional cloud economics dashboard designed to help developers and startups gain real-time visibility into AWS resource expenditures, forecast end-of-month spend, and prevent surprise billing incidents.

Designed to mirror the official **AWS Management Console** aesthetic with an emphasis on functional data visualization, clean tables, and zero visual clutter.

---

## 🏗️ System Architecture

Billow is architected as a decoupled, multi-tier system composed of a scheduled ingestion worker, a serverless database layer, a REST API server, and a modular dashboard client.

```
                  ┌──────────────────────────────┐
                  │    AWS Cost Explorer API     │
                  └──────────────┬───────────────┘
                                 │ Ingests costs (hourly/daily)
                                 ▼
                  ┌──────────────────────────────┐
                  │   Scheduled Python Lambda    │ (EventBridge Trigger)
                  └──────────────┬───────────────┘
                                 │ Writes records
                                 ▼
                  ┌──────────────────────────────┐
                  │      Amazon DynamoDB         │ (NoSQL Datastore)
                  └──────────────▲───────────────┘
                                 │ Query / Retrieve
                                 ▼
    ┌────────────────────────────────────────────────────────┐
    │                 BILLOW API ENGINE (Express.js + TS)     │
    │  - Evaluates cumulative month-to-date aggregates       │
    │  - Computes linear regression forecasting curves       │
    │  - Swaps to high-fidelity mock data if AWS is offline   │
    └────────────────────────────┬───────────────────────────┘
                                 │ Serves JSON endpoints (REST)
                                 ▼
    ┌────────────────────────────────────────────────────────┐
    │                 BILLOW CONSOLE CLIENT (React + TS)     │
    │  - AWS Management Console flat structural theme        │
    │  - Live overview cards (MTD Spend, Forecasts, Budget)   │
    │  - CloudWatch-style Line & Donut charts (Recharts)     │
    │  - Real-time alert settings and email/webhook logs     │
    └────────────────────────────────────────────────────────┘
```

### Data Flow Execution:
1. **Collector Stage**: A scheduled **AWS Lambda** python function triggers every 6 hours to pull cost usage grouped by AWS Service from the **AWS Cost Explorer API**.
2. **Persistence Stage**: Collected items are stored in **Amazon DynamoDB** tables (`BillowCosts` and `BillowBudget`) using a compound key pattern (`date` hash + `collectedAt` range) to maintain chronological audit history.
3. **API Engine Stage**: The **Node.js/TypeScript** server retrieves cost metrics, runs linear regression forecasting algorithms to predict cumulative spend by month-end, and evaluates if active budget thresholds have been breached.
4. **Client Console Stage**: The **React/TypeScript** frontend queries the API and renders a responsive dashboard matching AWS Console layout principles, using custom hooks for state sync.

---

## 🛠️ Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| **Frontend** | React (v19) + TypeScript | Component modularity, strong static typing, type safety. |
| **Visualizations** | Recharts (SVGs) | Responsive, fluid layouts, custom interactive legends and tooltips. |
| **Backend** | Express.js + TypeScript | Lightweight, fast request handling, clean service-route decoupling. |
| **Collector Worker**| Python 3.12 + Boto3 | Native AWS runtime support, simple scheduling. |
| **Datastore** | Amazon DynamoDB | Low-latency NoSQL, on-demand pricing, native IAM security boundaries. |
| **Infrastructure** | Docker + Compose | Identical developer environments, containerized client/server isolation. |

---

## 🚀 Local Development Setup

Billow includes a **High-Fidelity Mock Mode** enabled by default. It generates deterministic, realistic cost curves representing standard workloads (EC2, S3, RDS, Lambda) so you can run the entire stack locally in 2 minutes without needing active AWS credentials or databases.

### Step 1: Clone and Set Up Environment
```bash
# Clone the repository
git clone https://github.com/hiranya/billow.git
cd billow

# Create root-level environmental configurations
cp .env.example .env
```

### Step 2: Boot the Backend Engine
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
*The server will compile TypeScript and begin listening on `http://localhost:4000`. Mock data is generated automatically based on date seeds to prevent dashboard metric flickering.*

### Step 3: Boot the Console Client
```bash
cd ../client
npm install
npm run dev
```
*Vite will compile and spin up the hot-reload dashboard server on `http://localhost:5173`. Open this URL in your web browser.*

---

## 🐳 Running with Docker Compose

To test the application with a local replica database (DynamoDB Local) and explore the full infrastructure:

1. **Verify Docker is Running** on your host machine.
2. **Update Environment Variables**:
   In your root `.env` or `server/.env`, set `USE_MOCK_DATA=false` to instruct the server to talk to the database instead of generating in-memory metrics.
3. **Start the Docker Services**:
   ```bash
   docker compose up --build
   ```
4. **Initialize & Seed the Local Database**:
   ```bash
   # Run the setup script to create tables and insert 30 days of test history
   chmod +x ./scripts/init-dynamodb.sh
   ./scripts/init-dynamodb.sh
   ```
5. **Explore Database**:
   Visit `http://localhost:8001` to view the **DynamoDB Admin UI Console** where you can visually inspect tables, scan keys, and edit cost data.

---

## 🔒 License & Author
- **Author**: [Hiranyagarbh Singh Choudhary](https://github.com/hiranya)
- **License**: MIT License. See `LICENSE` for details.
