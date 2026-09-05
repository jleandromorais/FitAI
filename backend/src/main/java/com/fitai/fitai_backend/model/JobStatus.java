package com.fitai.fitai_backend.model;

// Ciclo de vida do WorkoutGenerationJob: PENDING (criado, aguardando o worker
// consumir), PROCESSING (worker pegou a mensagem — hoje não é usado de forma
// crítica, mas existe pra abrir espaço a um indicador melhor no polling do
// frontend no futuro), DONE/FAILED (estado terminal, setado por handleResult
// ou pelo próprio enqueue quando a publicação falha na hora).
public enum JobStatus {
    PENDING,
    PROCESSING,
    DONE,
    FAILED
}
