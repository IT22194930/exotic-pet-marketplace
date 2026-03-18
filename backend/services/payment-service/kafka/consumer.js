"use strict";
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "payment-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
});

/**
 * Start a Kafka consumer with retry logic for broker readiness.
 * @param {string}   groupId    Consumer group ID
 * @param {string[]} topics     Topics to subscribe to
 * @param {(topic: string, eventType: string, payload: object) => Promise<void>} onMessage
 */
async function startConsumer(groupId, topics, onMessage) {
  for (let attempt = 1; attempt <= 15; attempt++) {
    const consumer = kafka.consumer({ groupId });
    try {
      await consumer.connect();
      await new Promise((r) => setTimeout(r, 2000));

      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }

      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          try {
            const eventType = message.key?.toString();
            const payload = JSON.parse(message.value.toString());
            await onMessage(topic, eventType, payload);
          } catch (err) {
            console.error(
              `[kafka] Error processing message from "${topic}":`,
              err.message,
            );
          }
        },
      });

      console.log(
        `[kafka] payment-service consumer ready — topics: ${topics.join(", ")}`,
      );
      return;
    } catch (err) {
      console.warn(
        `[kafka] Attempt ${attempt}/15 failed (${err.message}), retrying in ${attempt * 3000}ms…`,
      );
      try {
        await consumer.disconnect();
      } catch {}
      if (attempt === 15) throw err;
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
}

module.exports = { startConsumer };
