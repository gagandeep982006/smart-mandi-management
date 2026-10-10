# Future Improvements Roadmap

This roadmap identifies planned technical evolutions, scalability enhancements, and new feature capabilities for the platform.

---

## 1. Technical & Infrastructure Evolutions

- **Redis Centralized Rate Limiting**:
  - Replace the process-local in-memory JavaScript `Map` with a distributed **Redis cluster** (`ioredis`) for multi-container and Kubernetes deployments. This will ensure global rate-limiting counters across all backend pods.
- **Automated Banking API Integration (PFMS / NPCI)**:
  - Integrate directly with India's **Public Financial Management System (PFMS)** and **National Automated Clearing House (NACH)** APIs for automated, real-time DBT direct bank transfers.
- **Event-Driven Messaging (Apache Kafka / RabbitMQ)**:
  - Transition from asynchronous MongoDB logging to an enterprise event bus (Kafka/RabbitMQ) for real-time audit event ingestion, analytics streaming, and SMS notifications.
- **Automated Database Failover**:
  - Implement MySQL Orchestrator or ProxySQL for automated Primary failover and topology discovery.

---

## 2. Functional & Operational Enhancements

- **Progressive Web App (PWA) & Mobile Application**:
  - Build a lightweight React Native or Flutter mobile application for farmers with offline token pass viewing and push notifications for token callings.
- **IoT Weighbridge Integration**:
  - Connect weighbridge digital indicator scales directly to the Mandi Portal via serial port/WebSocket APIs, automatically recording gross and tare weights without manual operator entry.
- **Multilingual Support (i18n)**:
  - Add native regional language translation (Hindi, Punjabi, Haryanvi, Telugu, etc.) across the Farmer and Mandi frontends.
- **Automated Land Registry Verification**:
  - Implement automated REST API integrations with state digital land record portals (e.g. *Bhoomi*, *AnyRoR*, *Jamabandi*) to automatically verify survey numbers and land ownership during registration.
