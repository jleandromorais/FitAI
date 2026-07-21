package com.fitai.fitai_backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {

    // Chave secreta usada para assinar/verificar os JWTs (HMAC)
    private final SecretKey key;
    // Tempo de expiração do access token (em ms)
    private final long expiration;
    // Tempo de expiração do refresh token (em ms)
    private final long refreshExpiration;
    // Gerador de números aleatórios criptograficamente seguro, usado no refresh token opaco
    private final SecureRandom secureRandom = new SecureRandom();

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expiration,
            @Value("${jwt.refresh-expiration}") long refreshExpiration) {
        // Converte a secret (string) em uma SecretKey válida para HMAC-SHA
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
        this.refreshExpiration = refreshExpiration;
    }

    // Expõe o tempo de expiração do refresh token em segundos (útil para cookies, respostas, etc.)
    public long getRefreshExpirationSeconds() {
        return refreshExpiration / 1000;
    }

    // Gera um refresh token opaco (não é um JWT): 48 bytes aleatórios em Base64 URL-safe.
    // Por não carregar claims, precisa ser persistido no banco para ser validado depois.
    public String generateRefreshToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // Calcula o instante de expiração do refresh token a partir de agora
    public Instant refreshTokenExpiry() {
        return Instant.now().plusSeconds(getRefreshExpirationSeconds());
    }

    // Gera um JWT assinado contendo o email do usuário como subject,
    // data de emissão e data de expiração (access token)
    public String generateToken(String email) {
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(key)
                .compact();
    }

    // Extrai o email (subject) do token, verificando a assinatura no processo.
    // Lança exceção se o token for inválido — só deve ser chamado após isValid() confirmar validade
    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    // Verifica se o token tem assinatura válida e não está expirado/malformado.
    // Qualquer falha de parsing/validação (expirado, assinatura incorreta, formato inválido)
    // é tratada como token inválido, sem propagar a exceção
    public boolean isValid(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
