"use strict";
const { Kafka } = require("kafkajs");

const KAFKA_ENABLED = process.env.KAFKA_BROKERS && process.env.KAFKA_BROKERS !== 'none';

let kafka = null;
let producer = null;
let ready = false;
let connectionPromise = null;

if (KAFKA_ENABLED) {
  kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "listing-service",
    brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
  });
  producer = kafka.producer();
}

/**
 * Publish an event to a Kafka topic.
 * @param {string} topic
 * @param {string} eventType  e.g. "listing.created"
 * @param {object} payload
 */
async function publish(topic, eventType, payload) {
  if (!KAFKA_ENABLED || !producer) {
    console.log(`[kafka] Skipped publishing ${eventType} (Kafka disabled)`);
    return;
  }

  try {
    if (!ready) {
      connectionPromise = connectionPromise || producer.connect();
      await connectionPromise;
      ready = true;
      connectionPromise = null;
      console.log("[kafka] listing-service producer connected");
    }
    await producer.send({
      topic,
      messages: [
        {
          key: eventType,
          value: JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            ...payload,
          }),
        },
      ],
    });
  } catch (error) {
    console.error(`[kafka] Failed to publish ${eventType}:`, error.message);
    // Don't throw - allow service to continue without Kafka
  }
}

module.exports = { publish };
