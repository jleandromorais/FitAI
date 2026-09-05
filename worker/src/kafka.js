"use strict";

const { Kafka } = require("kafkajs");

const brokers = (process.env.KAFKA_BOOTSTRAP_SERVERS || "localhost:9092")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const saslUsername = process.env.KAFKA_SASL_USERNAME;
const saslPassword = process.env.KAFKA_SASL_PASSWORD;

// SASL/SSL só é aplicado quando ambas as credenciais estão presentes — isso
// permite rodar contra o Redpanda local em plaintext sem nenhuma env var
// extra, e contra o broker gerenciado (produção) só configurando as duas.
const useSasl = Boolean(saslUsername && saslPassword);

const kafkaConfig = {
  clientId: "fitai-worker",
  brokers,
};

if (useSasl) {
  kafkaConfig.ssl = true;
  kafkaConfig.sasl = {
    mechanism: "plain",
    username: saslUsername,
    password: saslPassword,
  };
}

const kafka = new Kafka(kafkaConfig);

function producer() {
  return kafka.producer();
}

function consumer(groupId) {
  return kafka.consumer({ groupId });
}

module.exports = { kafka, producer, consumer };
