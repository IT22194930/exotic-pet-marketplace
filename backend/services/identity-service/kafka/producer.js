"use strict";
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "identity-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
});

const producer = kafka.producer();
let ready = false;

/**
 * Publish an event to a Kafka topic.
 * Connects on first call; retries if not yet connected.
 * @param {string} topic
 * @param {string} eventType  e.g. "user.registered"
 * @param {object} payload    event-specific data
 */
async function publish(topic, eventType, payload) {
  if (!ready) {
    await producer.connect();
    ready = true;
    console.log("[kafka] identity-service producer connected");
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
}

module.exports = { publish };
