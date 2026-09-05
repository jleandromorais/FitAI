# fitai-worker

Serviço Node.js standalone que consome pedidos de geração de treino do
tópico Kafka `fitai.workout-generation-requested`, monta o prompt e chama a
Groq (`openai/gpt-oss-120b`) para gerar o plano de treino, e publica o
resultado (sucesso ou falha) em `fitai.workout-generation-result`. É o
consumer da arquitetura assíncrona descrita em
`c:\Users\leand\.claude\plans\snappy-sleeping-tome.md`: o backend Java
enfileira o pedido e escuta o resultado, o frontend só faz polling no
backend — este worker nunca é chamado diretamente por eles.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha KAFKA_BOOTSTRAP_SERVERS, GROQ_API_KEY etc.
npm start
```

Requer um broker Kafka-compatível acessível em `KAFKA_BOOTSTRAP_SERVERS`
(o Redpanda do `docker-compose.yml` na raiz do repo serve para isso em
dev local, sem SASL). Health check disponível em `GET /health` na porta
definida por `PORT` (padrão `8080`).
