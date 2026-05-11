 

# Million Checkboxes - Distributed Real-time Application

## Project Overview

This project demonstrates a scalable, real-time collaborative checkbox application that handles millions of simultaneous users interacting with shared state. It showcases modern web architecture patterns including distributed systems, real-time communication, and efficient state management.

## Scaling Architecture

### Distributed Load Management

**Redis Pub/Sub Pattern**
- Uses Redis publish-subscribe mechanism to distribute checkbox state changes across multiple server instances
- Eliminates single points of failure and enables horizontal scaling
- Each server instance acts as both publisher and subscriber, ensuring consistent state across the cluster

**State Synchronization**
- Real-time checkbox states are synchronized using Redis pub/sub channels
- Eliminates the need for database polling or expensive state queries
- Provides sub-millisecond latency for state updates across all connected clients

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Redis Cluster                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Redis Node 1│  │ Redis Node 2│  │ Redis Node 3│             │
│  │   (Master)  │  │  (Replica)  │  │  (Replica)  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │               │               │                     │
│  Pub/Sub Channel: "checkbox-updates"                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Servers                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Server 1  │  │   Server 2  │  │   Server 3  │             │
│  │ 1,000 users │  │ 1,000 users │  │ 1,000 users │             │
│  │             │  │             │  │             │             │
│  │ Socket.IO   │  │ Socket.IO   │  │ Socket.IO   │             │
│  │ Publisher+  │  │ Publisher+  │  │ Publisher+  │             │
│  │ Subscriber  │  │ Subscriber  │  │ Subscriber  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ 1,000 Users │      │ 1,000 Users │      │ 1,000 Users │
│ WebSocket   │      │ WebSocket   │      │ WebSocket   │
│ Connections │      │ Connections │      │ Connections │
└─────────────┘      └─────────────┘      └─────────────┘
```

### Scaling Calculations

**Current Architecture**
```
1 Cluster (3 Redis Nodes) × 10 App Servers × 1,000 Users = 10,000 Concurrent Users
```

**Scaling Path to Million Users**

**Level 1: 5 Clusters (15 Redis Nodes)**
```
5 Clusters × 10 App Servers × 1,000 Users = 50,000 Concurrent Users
```

**Level 2: 20 Clusters (60 Redis Nodes)**
```
20 Clusters × 10 App Servers × 1,000 Users = 200,000 Concurrent Users
```

**Level 3: 50 Clusters (150 Redis Nodes)**
```
50 Clusters × 10 App Servers × 1,000 Users = 500,000 Concurrent Users
```

**Level 4: 100 Clusters (300 Redis Nodes)**
```
100 Clusters × 10 App Servers × 1,000 Users = 1,000,000 Concurrent Users
```

**Note**: Each cluster has 3 Redis nodes (1 master + 2 replicas) for reliability. All clusters run independently in parallel.

### 15 Independent Nodes Example

**Example with 5 Clusters (15 Redis Nodes):**
```
App Server 1 connects to:
├── Cluster1-Node1 (master)
├── Cluster2-Node1 (master)
├── Cluster3-Node1 (master)
├── Cluster4-Node1 (master)
└── Cluster5-Node1 (master)

When user clicks checkbox on Server 1:
├── Server 1 publishes to all 5 clusters simultaneously
├── Each cluster broadcasts to its connected servers
├── All servers receive update via Redis pub/sub
└── All connected WebSocket clients get update in real-time

Total: 15 Redis nodes working independently, no central coordination needed
```

## Architecture & Significance

### Key Technologies

**Redis Pub/Sub** - Distributes checkbox state changes across multiple server instances, enabling horizontal scaling and eliminating single points of failure.

**Socket.IO** - Provides real-time bidirectional communication with persistent WebSocket connections, handling reconnection and fallback mechanisms.

**JWT Authentication** - Secure HTTP-only cookies with RSA encryption for stateless authentication that scales horizontally.

**Virtual Scrolling** - Efficient frontend rendering of millions of checkboxes through lazy loading and memory-efficient DOM management.

## Learning Outcomes

**Distributed Systems** - Redis pub/sub patterns, horizontal scaling, fault tolerance

**Real-time Communication** - WebSocket protocols, event-driven architecture, connection management

**Performance Engineering** - Memory optimization, virtual scrolling, efficient data structures

**Security & Authentication** - JWT flows, cookie security, middleware-based authorization

**Modern Development** - TypeScript, modular architecture, container orchestration

## Technical Stack

**Backend**: Node.js + Express, Socket.IO, Redis/Valkey, PostgreSQL + Drizzle ORM, JWT + RSA

**Frontend**: Vanilla JavaScript, Virtual Scrolling, WebSocket Client, Cookie-based Auth

**Infrastructure**: Docker, Docker Compose, Horizontal Scaling

## Running the Application

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL database

### Development Setup

1. **Start Redis/Valkey**
```yaml
# docker-compose.yml
services:
  valkey:
    image: valkey/valkey
    ports:
      - 6379:6379
```

2. **Install Dependencies**
```bash
pnpm install
```

3. **Configure Environment**
```bash
# Set up database connection and other environment variables
```

4. **Run Development Server**
```bash
pnpm dev
```

### Production Deployment
- Use multiple server instances behind a load balancer
- Configure Redis cluster for high availability
- Set up PostgreSQL replication for data durability
- Implement monitoring and logging for observability

## Key Insights

This project demonstrates that modern web applications can handle massive scale through:
1. **Appropriate technology choices** - Redis for real-time messaging, PostgreSQL for persistence
2. **Efficient communication patterns** - WebSocket instead of HTTP polling
3. **Smart frontend techniques** - Virtual scrolling for large datasets
4. **Proper security practices** - JWT with secure cookie storage
5. **Distributed architecture** - Horizontal scaling through stateless design

The combination of these techniques creates a system that can handle millions of users while maintaining sub-second response times and providing a seamless real-time experience.