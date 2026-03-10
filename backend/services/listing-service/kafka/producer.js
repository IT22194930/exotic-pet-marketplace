"use strict";
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "listing-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
});

const producer = kafka.producer();
let ready = false;
let connectionPromise = null;

/**
 * Publish an event to a Kafka topic.
 * @param {string} topic
 * @param {string} eventType  e.g. "listing.created"
 * @param {object} payload
 */
async function publish(topic, eventType, payload) {
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
}

module.exports = { publish };
