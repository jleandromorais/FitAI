package com.fitai.fitai_backend.exception;

// Lançada quando um recurso solicitado não existe ou não pertence ao usuário autenticado.
// Mapeada para HTTP 404 pelo GlobalExceptionHandler — separada de IllegalArgumentException
// (400), que segue reservada para erros de validação de entrada.
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
