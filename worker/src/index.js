"use strict";

const { createHealthApp } = require("./health");
const producer = require("./producer");
const consumer = require("./consumer");

const PORT = process.env.PORT || 8080;

let httpServer;

async function main() {
  const app = createHealthApp();
  httpServer = app.listen(PORT, () => {
    console.log(`Health server listening on port ${PORT}`);
  });

  // Producer antes do consumer: garante que já é possível responder a uma
  // mensagem assim que ela chegar, em vez de consumir e só então descobrir
  // que o producer ainda não conectou.
  await producer.connect();
  console.log("Kafka producer conectado.");

  await consumer.start();
  console.log("Kafka consumer conectado e consumindo.");
}

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Recebido ${signal}, desligando graciosamente...`);

  try {
    await consumer.disconnect();
  } catch (err) {
    console.error("Erro ao desconectar consumer:", err);
  }

  try {
    await producer.disconnect();
  } catch (err) {
    console.error("Erro ao desconectar producer:", err);
  }

  if (httpServer) {
    httpServer.close();
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch(err => {
  console.error("Falha fatal ao iniciar o worker:", err);
  process.exit(1);
});
