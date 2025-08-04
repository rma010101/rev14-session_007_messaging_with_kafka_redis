// app.js
// This script sets up a Node.js application to handle real-time MRT alerts using Kafka for messaging and Redis for caching.
// It provides a command-line interface for users to send messages and see incoming alerts.

const { Kafka } = require('kafkajs');
const { createClient } = require('redis');
const readline = require('readline');

// ====================================================================
// Configuration
// ====================================================================
// These are placeholder values. You will need to replace them with your actual Kafka and Redis server details.
const KAFKA_BROKERS = ['localhost:9092']; // Replace with your Kafka broker list
const KAFKA_TOPIC = 'mrt-alerts';
const REDIS_CONFIG = {
  url: 'redis://127.0.0.1:6380' // Updated Redis server URL for new instance
};
const REDIS_MESSAGE_KEY = 'recent-mrt-train-lines-alerts';
const MAX_REDIS_MESSAGES = 10; // Number of messages to cache in Redis

// ====================================================================
// Initialize Kafka Clients
// ====================================================================
const kafka = new Kafka({
  clientId: 'mrt-train-lines-messaging-app',
  brokers: KAFKA_BROKERS
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'mrt-train-lines-alert-group' });
const admin = kafka.admin(); // Initialize the Admin client for topic management

// ====================================================================
// Initialize Redis Client
// ====================================================================
const redisClient = createClient(REDIS_CONFIG);

// Function to handle connection and error events for Redis
redisClient.on('error', err => console.error('[Redis] Connection Error:', err));
redisClient.on('connect', () => console.log('[Redis] Connected successfully.'));

// ====================================================================
// Main Application Logic
// ====================================================================
const run = async () => {
  try {
    // Connect to Kafka Admin client
    await admin.connect();
    
    // Check for and create the topic if it doesn't exist
    await createTopicIfNotExists();

    // Connect both Kafka producer and consumer clients
    await producer.connect();
    await consumer.connect();
    await redisClient.connect();

    // Subscribe to the Kafka topic
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });

    // Start the Kafka consumer to process incoming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const receivedMessage = message.value.toString();
          console.log(`\n---`);
          console.log(`[Kafka] New Alert: ${receivedMessage}`);
          console.log(`---`);
          
          // Store the new message in Redis for caching
          await storeMessageInRedis(receivedMessage);

          // Restore the command-line prompt
          promptUser();
        } catch (error) {
          console.error('[Consumer] Error processing message:', error);
        }
      },
    });

    // Setup the command-line interface
    setupCli();

    console.log(`[App] MRT Train Lines Messaging app is running. Type your alert message and press Enter.`);

  } catch (error) {
    console.error('[App] Fatal error during setup:', error);
    process.exit(1);
  } finally {
    // Disconnect the Admin client after setup
    await admin.disconnect();
  }
};

// ====================================================================
// Kafka Admin Logic
// ====================================================================
const createTopicIfNotExists = async () => {
  console.log(`[Admin] Checking for topic '${KAFKA_TOPIC}'...`);
  try {
    const topics = await admin.listTopics();
    if (!topics.includes(KAFKA_TOPIC)) {
      console.log(`[Admin] Topic '${KAFKA_TOPIC}' not found. Creating...`);
      await admin.createTopics({
        topics: [{
          topic: KAFKA_TOPIC,
          numPartitions: 1,
          replicationFactor: 1,
        }],
      });
      console.log(`[Admin] Topic '${KAFKA_TOPIC}' created successfully.`);
    } else {
      console.log(`[Admin] Topic '${KAFKA_TOPIC}' already exists.`);
    }
  } catch (error) {
    console.error('[Admin] Error creating topic:', error);
    throw error; // Re-throw to halt the application
  }
};

// ====================================================================
// Kafka Producer Logic
// ====================================================================
const sendMessage = async (message) => {
  if (!message || message.trim() === '') {
    console.log('[App] Message cannot be empty.');
    return;
  }
  try {
    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [{ value: message }],
    });
    console.log(`[Producer] Sent: "${message}"`);
  } catch (error) {
    console.error('[Producer] Error sending message:', error);
  }
};

// ====================================================================
// Redis Caching Logic
// ====================================================================
const storeMessageInRedis = async (message) => {
  try {
    // Add the new message to the end of the Redis list
    await redisClient.RPUSH(REDIS_MESSAGE_KEY, message);
    
    // Trim the list to keep only the most recent messages
    await redisClient.LTRIM(REDIS_MESSAGE_KEY, -(MAX_REDIS_MESSAGES), -1);
  } catch (error) {
    console.error('[Redis] Error storing message:', error);
  }
};

const getRecentMessagesFromRedis = async () => {
  try {
    const recentMessages = await redisClient.LRANGE(REDIS_MESSAGE_KEY, 0, -1);
    console.log('\n--- Recent Alerts (from Redis Cache) ---');
    if (recentMessages.length === 0) {
      console.log('No recent messages found.');
    } else {
      recentMessages.forEach(msg => console.log(`- ${msg}`));
    }
    console.log('----------------------------------------');
  } catch (error) {
    console.error('[Redis] Error retrieving messages:', error);
  }
};

// ====================================================================
// Command-line Interface (CLI) Setup
// ====================================================================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'MRT Train Lines Alert > '
});

const setupCli = () => {
  // Listen for user input
  rl.on('line', async (input) => {
    const trimmedInput = input.trim();
    if (trimmedInput.toLowerCase() === 'exit') {
      console.log('[App] Exiting application...');
      await producer.disconnect();
      await consumer.disconnect();
      await redisClient.quit();
      rl.close();
      process.exit(0);
    } else if (trimmedInput.toLowerCase() === 'recent') {
      await getRecentMessagesFromRedis();
      promptUser();
    } else {
      await sendMessage(trimmedInput);
      promptUser();
    }
  });

  // Prompt the user for input
  promptUser();
};

const promptUser = () => {
  rl.prompt();
};

// Start the application
run();

