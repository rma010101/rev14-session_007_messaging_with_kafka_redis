# METRO Lines Messaging System

A real-time messaging application for METRO (Mass Rapid Transit) alerts using **Kafka** for message streaming and **Redis** for high-speed caching.

## 🏗️ Architecture Overview

This application demonstrates a robust, scalable real-time messaging system that combines the power of Apache Kafka's distributed streaming with Redis's lightning-fast in-memory caching.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Input    │──▶│   Kafka Topic   │───▶│  Redis Cache    │
│  (CLI Commands) │    │ 'metro-alerts'  │    │(Recent Messages)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Producer      │    │   Consumer      │    │  Fast Retrieval │
│ (Send Messages) │    (Receive Messages)│    │ (Type 'recent') │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Technology Stack

- **Node.js**: Runtime environment
- **Apache Kafka**: Distributed streaming platform for real-time message handling
- **Redis**: In-memory data store for caching recent alerts
- **KafkaJS**: Kafka client library for Node.js
- **Redis Client**: Node.js Redis client library

## 🚀 Features

### Real-Time Messaging (Kafka)
- **Message Broadcasting**: Alerts are distributed to all connected consumers
- **Topic Management**: Automatically creates `metro-alerts` topic if it doesn't exist
- **Scalable Architecture**: Multiple producers and consumers can operate simultaneously
- **Message Persistence**: Messages are stored and can be replayed
- **Fault Tolerance**: System continues operating even if some components fail

### High-Speed Caching (Redis)
- **Recent Alerts Cache**: Stores the 10 most recent messages in memory
- **Sub-millisecond Access**: Lightning-fast retrieval of cached data
- **Automatic Cleanup**: Maintains only the most recent messages
- **Memory Efficiency**: Uses Redis lists for optimal queue management

### Interactive CLI
- **Send Alerts**: Type any message to broadcast METRO alerts
- **View History**: Type `recent` to see cached recent alerts
- **Clean Exit**: Type `exit` to gracefully shut down all connections

## 📋 Prerequisites

Before running the application, ensure you have:

1. **Node.js** (v14 or higher)
2. **Apache Kafka** server running on `localhost:9092`
3. **Redis** server running on `localhost:6380`

## 🛠️ Installation

1. **Clone or download** the project files
2. **Install dependencies**:
   ```bash
   npm install kafkajs redis
   ```

## ⚙️ Configuration

The application is configured in `app.js`:

```javascript
// Kafka Configuration
const KAFKA_BROKERS = ['localhost:9092'];
const KAFKA_TOPIC = 'metro-alerts';

// Redis Configuration
const REDIS_CONFIG = {
  url: 'redis://127.0.0.1:6380'
};

// Cache Settings
const REDIS_MESSAGE_KEY = 'recent-metro-train-lines-alerts';
const MAX_REDIS_MESSAGES = 10; // Number of recent messages to cache
```

## 🚀 Getting Started

### Step 1: Start Redis Server
```bash
# Start Redis on port 6380 (to avoid conflicts)
redis-server --port 6380
```

### Step 2: Start Kafka Server
```bash
# Start Kafka (ensure Zookeeper is running first)
# Kafka should be running on localhost:9092
```

### Step 3: Run the Application
```bash
node app.js
```

### Step 4: Use the CLI
```
METRO Train Lines Alert > Circle Line: Signal fault at Bishan
[Producer] Sent: "Circle Line: Signal fault at Bishan"

METRO Train Lines Alert > recent
--- Recent Alerts (from Redis Cache) ---
- Circle Line: Signal fault at Bishan
----------------------------------------

METRO Train Lines Alert > exit
```

## 🔄 Message Flow Architecture

### 1. Message Publishing Flow
```
User Input → Kafka Producer → metro-alerts Topic → All Consumers → Redis Cache → Display
```

### 2. Message Consumption Flow
```
Kafka Consumer → Process Message → Store in Redis → Update CLI Display
```

### 3. Cache Retrieval Flow
```
User Types 'recent' → Redis LRANGE → Display Cached Messages
```

## 🏢 Real-World Application Scenarios

### Transit Authority Control Center
- **Multiple Operators**: Different staff can send alerts simultaneously
- **Real-time Distribution**: All monitoring systems receive updates instantly
- **Quick Reference**: Operations center can view recent alerts without database queries

### Scalability Example
```
📱 Station Manager (East Coast) → Kafka → Redis → 🖥️ All Control Centers
📱 Train Operator (Circle Line) → Kafka → Redis → 📱 Mobile Apps
📱 Maintenance Team (North East) → Kafka → Redis → 🌐 Public Website
```

## 📊 System Components Explained

### Kafka Components

#### Producer
```javascript
const producer = kafka.producer();
await producer.send({
  topic: KAFKA_TOPIC,
  messages: [{ value: message }]
});
```
- Sends METRO alert messages to the Kafka topic
- Ensures message delivery to all subscribers

#### Consumer
```javascript
const consumer = kafka.consumer({ groupId: 'metro-train-lines-alert-group' });
await consumer.run({
  eachMessage: async ({ message }) => {
    // Process incoming alerts
    await storeMessageInRedis(message.value.toString());
  }
});
```
- Listens for new alerts from the Kafka topic
- Automatically caches received messages in Redis

#### Admin Client
```javascript
const admin = kafka.admin();
await admin.createTopics({
  topics: [{ topic: KAFKA_TOPIC, numPartitions: 1, replicationFactor: 1 }]
});
```
- Manages Kafka infrastructure
- Creates topics automatically if they don't exist

### Redis Operations

#### Caching New Messages
```javascript
await redisClient.RPUSH(REDIS_MESSAGE_KEY, message);
await redisClient.LTRIM(REDIS_MESSAGE_KEY, -(MAX_REDIS_MESSAGES), -1);
```
- Adds new messages to the end of the list
- Maintains only the most recent 10 messages

#### Retrieving Cached Messages
```javascript
const recentMessages = await redisClient.LRANGE(REDIS_MESSAGE_KEY, 0, -1);
```
- Retrieves all cached messages instantly
- No database queries required

## 🔒 Error Handling

The application includes comprehensive error handling:

- **Kafka Connection Errors**: Graceful failure with error logging
- **Redis Connection Errors**: Connection event monitoring
- **Message Processing Errors**: Individual message failures don't crash the system
- **Graceful Shutdown**: Proper cleanup of all connections on exit

## 📈 Performance Benefits

### Kafka Advantages
- **High Throughput**: Handles thousands of messages per second
- **Horizontal Scaling**: Add more brokers to increase capacity
- **Message Persistence**: Messages survive system restarts
- **Load Distribution**: Multiple consumers can share the workload

### Redis Advantages
- **Sub-millisecond Latency**: Faster than traditional databases
- **Memory Efficiency**: Optimized data structures for caching
- **Atomic Operations**: Thread-safe list operations
- **High Availability**: Master-slave replication support

## 🚦 Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `[message]` | Send METRO alert | `Red Line: 15 min delay at Orchard` |
| `recent` | View cached alerts | Shows last 10 messages from Redis |
| `exit` | Shutdown application | Cleanly disconnects all services |

## 🔧 Troubleshooting

### Common Issues

1. **Kafka Connection Failed**
   ```
   Error: Connection refused to localhost:9092
   ```
   - Ensure Kafka server is running
   - Check if port 9092 is available

2. **Redis Connection Failed**
   ```
   [Redis] Connection Error: ECONNREFUSED
   ```
   - Ensure Redis server is running on port 6380
   - Check Redis server logs

3. **Topic Creation Failed**
   ```
   [Admin] Error creating topic
   ```
   - Ensure Kafka has proper permissions
   - Check Kafka server configuration

## 📝 Development Notes

### Adding New Features
- **Additional Topics**: Create separate topics for different alert types
- **Message Filtering**: Add logic to filter messages by line or severity
- **Persistence**: Add database storage for long-term message history
- **Authentication**: Implement user authentication for message sending

### Scaling Considerations
- **Multiple Partitions**: Increase Kafka topic partitions for higher throughput
- **Consumer Groups**: Add more consumer instances for load distribution
- **Redis Clustering**: Use Redis cluster for high availability
- **Load Balancing**: Distribute producers across multiple Kafka brokers

## 📄 License

rma010101
---

**Built with ❤️ for Singapore's METRO System**
