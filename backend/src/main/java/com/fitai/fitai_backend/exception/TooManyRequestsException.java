package com.fitai.fitai_backend.exception;

// Lançada quando um usuário excede a cota de uma operação cara dentro de uma
// janela de tempo (ex: geração de treino por IA, que dispara uma chamada paga
// à Groq por pedido). Mapeada para HTTP 429 pelo GlobalExceptionHandler.
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
