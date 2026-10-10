# System Architecture Documentation

This section provides an architectural breakdown of the **Digital Agricultural & Mandi Procurement Ecosystem**, covering system topology, component responsibilities, cross-portal communication, database routing, and architectural decisions.

---

## 📑 In This Section

1. **[System Overview](./system-overview.md)**: High-level architectural topology, multi-tier layout, and shared services.
2. **[Portal Responsibilities](./portal-responsibilities.md)**: Detailed breakdown of the functional boundaries for Government, Mandi, Farmer, Payment, and Home portals.
3. **[Portal Communication & Boundaries](./portal-communication.md)**: Shared database pattern, domain isolation, and loose coupling mechanisms.
4. **[Database Routing & Topology](./database-routing.md)**: Primary (Write) vs Secondary (Read) routing, pool management, and fallback mechanisms.
5. **[Deployment Architecture](./deployment-architecture.md)**: Port allocation, reverse proxies, process management, and multi-process architecture.
6. **[Architecture Decision Records (ADRs)](./architecture-decisions.md)**: Key technical decisions, trade-offs, and design rationale.

---

## 🏛️ Ecosystem High-Level Architecture

```mermaid
flowchart TB
    subgraph ClientTier [Frontend Client Tier]
        Home["Home Hub (Port 3005)"]
        GovUI["Government UI (Port 3001)"]
        MandiUI["Mandi UI (Port 3000)"]
        FarmerUI["Farmer UI (Port 3002)"]
        PaymentUI["Payment UI (Port 3004)"]
    end

    subgraph GatewayTier [Express Backend Services]
        GovAPI["Government Backend (Port 5001)"]
        MandiAPI["Mandi Backend (Port 5001/5002)"]
        FarmerAPI["Farmer Backend (Port 5002)"]
        PaymentAPI["Payment Backend (Port 5004)"]
    end

    subgraph DataTier [Storage & Persistence Tier]
        subgraph MySQLCluster [MySQL Replication Cluster]
            PrimaryDB[("Primary MySQL (Write)")]
            Sec1[("Secondary 1 (Read)")]
            Sec2[("Secondary 2 (Read)")]
            Sec3[("Secondary 3 (Read)")]
        end
        MongoDB[("MongoDB (farmer_history)")]
    end

    Home -.-> GovUI
    Home -.-> MandiUI
    Home -.-> FarmerUI
    Home -.-> PaymentUI

    GovUI --> GovAPI
    MandiUI --> MandiAPI
    FarmerUI --> FarmerAPI
    PaymentUI --> PaymentAPI

    GovAPI --> PrimaryDB
    GovAPI --> Sec1
    MandiAPI --> PrimaryDB
    MandiAPI --> Sec2
    FarmerAPI --> PrimaryDB
    FarmerAPI --> Sec1
    PaymentAPI --> PrimaryDB
    PaymentAPI --> Sec3

    GovAPI -.-> MongoDB
    MandiAPI -.-> MongoDB
    FarmerAPI -.-> MongoDB
    PaymentAPI -.-> MongoDB
```
