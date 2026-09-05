"use strict";

const { consumer: createConsumer } = require("./kafka");
const groqClient = require("./groqClient");
const producer = require("./producer");

const REQUESTED_TOPIC = process.env.WORKOUT_GEN_REQUESTED_TOPIC || "fitai.workout-generation-requested";
const GROUP_ID = process.env.KAFKA_CONSUMER_GROUP || "fitai-worker-workout-generation";
const RETRY_DELAY_MS = 2000;

const consumer = createConsumer(GROUP_ID);

const QUOTA_ERROR_MESSAGE = "Cota diária da IA excedida, tente novamente mais tarde.";
const GENERIC_ERROR_MESSAGE = "Erro ao gerar treino. Tente novamente mais tarde.";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendFailed(event, errorMessage) {
  try {
    await producer.sendResult({
      jobId: event.jobId,
      userEmail: event.userEmail,
      status: "FAILED",
      workouts: null,
      errorMessage,
      completedAt: new Date().toISOString(),
    });
  } catch (sendErr) {
    // Se nem o produce do resultado de falha funcionar, não há mais nada a
    // fazer além de logar — o job fica pendurado do lado do backend, mas o
    // consumer segue vivo e comita o offset (ver comentário em eachMessage).
    console.error("Falha ao produzir resultado FAILED para jobId", event && event.jobId, sendErr);
  }
}

async function handleRequest(event) {
  try {
    const workouts = await groqClient.generateWorkouts(event);
    await producer.sendResult({
      jobId: event.jobId,
      userEmail: event.userEmail,
      status: "DONE",
      workouts,
      errorMessage: null,
      completedAt: new Date().toISOString(),
    });
    return;
  } catch (err) {
    if (err && err.status === 429) {
      console.error("Groq quota exceeded for jobId", event.jobId);
      await sendFailed(event, QUOTA_ERROR_MESSAGE);
      return;
    }

    console.error("Erro transitório gerando treino para jobId", event.jobId, "- tentando novamente uma vez", err);
    await sleep(RETRY_DELAY_MS);

    try {
      const workouts = await groqClient.generateWorkouts(event);
      await producer.sendResult({
        jobId: event.jobId,
        userEmail: event.userEmail,
        status: "DONE",
        workouts,
        errorMessage: null,
        completedAt: new Date().toISOString(),
      });
    } catch (retryErr) {
      console.error("Falha definitiva gerando treino para jobId", event.jobId, retryErr);
      await sendFailed(event, GENERIC_ERROR_MESSAGE);
    }
  }
}

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: REQUESTED_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      // Tudo aqui dentro precisa ser resolvido em DONE ou FAILED — nenhuma
      // exceção pode escapar de eachMessage, senão o kafkajs para de
      // consumir e nunca comita o offset dessa mensagem.
      let event;
      try {
        event = JSON.parse(message.value.toString());
      } catch (parseErr) {
        console.error("Mensagem requested malformada, ignorando:", parseErr, message.value && message.value.toString());
        return;
      }

      try {
        await handleRequest(event);
      } catch (unexpectedErr) {
        // Rede de segurança final: mesmo um erro inesperado dentro de
        // handleRequest (ex: falha ao produzir o resultado DONE) não pode
        // derrubar o consumer loop. Tenta deixar o job resolvido como
        // FAILED antes de desistir.
        console.error("Erro inesperado processando jobId", event && event.jobId, unexpectedErr);
        await sendFailed(event || {}, GENERIC_ERROR_MESSAGE);
      }
    },
  });
}

async function disconnect() {
  await consumer.disconnect();
}

module.exports = { start, disconnect };
