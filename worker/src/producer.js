"use strict";

const { producer: createProducer } = require("./kafka");

const RESULT_TOPIC = process.env.WORKOUT_GEN_RESULT_TOPIC || "fitai.workout-generation-result";

const producer = createProducer();

let connectPromise = null;

// Lazily connects on first use — also called eagerly from index.js at
// startup so the producer is ready before the consumer could need to
// produce a result. Calling it more than once is safe (kafkajs no-ops a
// connect() on an already-connected producer, and we memoize the promise
// either way so concurrent callers await the same connection attempt).
function connect() {
  if (!connectPromise) {
    connectPromise = producer.connect();
  }
  return connectPromise;
}

async function disconnect() {
  await producer.disconnect();
}

/**
 * Sends a workout-generation result event, keyed by jobId.
 * @param {{jobId: number|string}} resultEvent
 */
async function sendResult(resultEvent) {
  await connect();
  await producer.send({
    topic: RESULT_TOPIC,
    messages: [
      {
        key: String(resultEvent.jobId),
        value: JSON.stringify(resultEvent),
      },
    ],
  });
}

module.exports = { connect, disconnect, sendResult };
