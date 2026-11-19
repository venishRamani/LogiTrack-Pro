### LogiTrack Pro // Real-Time Fleet Telemetry System

A low-latency fleet tracking and telemetry engine built to ingest high-frequency GPS coordinates over WebSockets, buffer updates through a batch queue, and broadcast live state changes to dispatcher dashboards.

---

### System Architecture & Stack
* **Real-Time Gateway:** Node.js, Socket.io (Bi-directional WebSocket event streaming)
* **Ingestion Buffering:** Asynchronous in-memory telemetry queue with scheduled batch flushing (prevents database write locks under high concurrency)
* **REST API & Dashboard:** Express.js with a live telemetry console

---

### Core Engineering Concepts
* **Decoupled Write Path:** Separates live WebSocket broadcasting from persistent storage writes via a 5-second batch worker.
* **Event-Driven UI:** Eliminates HTTP polling by pushing coordinate deltas directly to connected dispatcher clients.
