
package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.AuthResponse;
import com.fitai.fitai_backend.dto.ForgotPasswordRequest;
import com.fitai.fitai_backend.dto.GoogleAuthRequest;
import com.fitai.fitai_backend.dto.LoginRequest;
import com.fitai.fitai_backend.dto.RefreshRequest;
import com.fitai.fitai_backend.dto.RegisterRequest;
import com.fitai.fitai_backend.dto.ResetPasswordRequest;
import com.fitai.fitai_backend.model.User;
import com.fitai.fitai_backend.repository.UserRepository;
import com.fitai.fitai_backend.security.JwtUtil;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository      userRepository;
    private final PasswordEncoder     passwordEncoder;
    private final JwtUtil             jwtUtil;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final EmailService        emailService;

    // Hash de senha nunca usado por conta real — comparado contra o password informado
    // quando o e-mail não existe ou a conta não tem senha (Google-only), pra manter o
    // tempo de resposta igual ao de um login que realmente roda BCrypt. Sem isso, a
    // diferença de tempo entre os dois caminhos denuncia quais e-mails estão cadastrados.
    private volatile String dummyPasswordHash;

    private String dummyPasswordHash() {
        if (dummyPasswordHash == null) {
            dummyPasswordHash = passwordEncoder.encode("dummy-" + UUID.randomUUID());
        }
        return dummyPasswordHash;
    }

    // Tokens de refresh/reset são opacos e de alta entropia — SHA-256 é suficiente
    // (não são senhas de baixa entropia sujeitas a força bruta offline). Guardar o hash
    // em vez do valor cru evita que um vazamento do banco entregue sessões/tokens de
    // reset prontos para uso.
    static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }

    public AuthResponse register(RegisterRequest request) {
        log.info("Tentativa de registro: email={}", request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registro recusado — email já cadastrado: {}", request.getEmail());
            throw new IllegalArgumentException("Email já cadastrado.");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            // Duas requisições concorrentes podem passar no existsByEmail antes de
            // qualquer uma salvar — a constraint única do banco é a garantia real.
            log.warn("Registro recusado — corrida detectada na constraint única: email={}", request.getEmail());
            throw new IllegalArgumentException("Email já cadastrado.");
        }

        log.info("Usuário registrado com sucesso: email={}", user.getEmail());
        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {

        log.info("Tentativa de login: email={}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        // Sempre roda o BCrypt, mesmo quando o e-mail não existe ou a conta é
        // Google-only (sem senha) — contra um hash "dummy" nesses casos — para que o
        // tempo de resposta não denuncie quais e-mails estão cadastrados.
        String hashToCheck = (user != null && user.getPassword() != null)
                ? user.getPassword()
                : dummyPasswordHash();
        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), hashToCheck);

        if (user == null || !passwordMatches) {
            log.warn("Login falhou: email={}", request.getEmail());
            throw new BadCredentialsException("Credenciais inválidas.");
        }

        log.info("Login bem-sucedido: email={}", user.getEmail());
        return buildAuthResponse(user);
    }

    public AuthResponse loginWithGoogle(GoogleAuthRequest request) {
        log.info("Tentativa de login via Google");

        GoogleIdToken.Payload payload = googleTokenVerifier.verify(request.getIdToken());

        // Um e-mail não verificado no Google não prova posse — sem essa checagem,
        // alguém poderia se autenticar como o dono de uma conta já existente aqui.
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            log.warn("Login Google recusado — e-mail não verificado: {}", payload.getEmail());
            throw new BadCredentialsException("E-mail do Google não verificado.");
        }

        String googleId = payload.getSubject();
        String email    = payload.getEmail();
        String name     = (String) payload.get("name");

        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmail(email))
                .orElseGet(() -> {
                    log.info("Novo usuário via Google: email={}", email);
                    return userRepository.save(User.builder()
                            .name(name).email(email).googleId(googleId).build());
                });

        if (user.getGoogleId() == null) {
            user.setGoogleId(googleId);
        } else if (!user.getGoogleId().equals(googleId)) {
            // Conta encontrada por e-mail já está vinculada a um googleId diferente —
            // aceitar aqui seria confiar cegamente numa identidade Google divergente.
            log.warn("Login Google recusado — googleId divergente do vinculado: email={}", email);
            throw new BadCredentialsException("Conta já vinculada a outra credencial Google.");
        }

        log.info("Login Google bem-sucedido: email={}", email);
        return buildAuthResponse(user);
    }

    public AuthResponse refresh(RefreshRequest request) {
        log.debug("Tentativa de refresh token");

        User user = userRepository.findByRefreshToken(hashToken(request.getRefreshToken()))
                .orElseThrow(() -> {
                    log.warn("Refresh falhou — token não encontrado");
                    return new BadCredentialsException("Refresh token inválido.");
                });

        if (user.getRefreshTokenExpiry() == null || Instant.now().isAfter(user.getRefreshTokenExpiry())) {
            log.warn("Refresh falhou — token expirado: email={}", user.getEmail());
            user.setRefreshToken(null);
            user.setRefreshTokenExpiry(null);
            userRepository.save(user);
            throw new BadCredentialsException("Refresh token expirado. Faça login novamente.");
        }

        log.info("Refresh token renovado: email={}", user.getEmail());
        return buildAuthResponse(user);
    }

    // Gera um token de reset, armazena no usuário (válido por 30 min) e envia por e-mail.
    // Sempre retorna normalmente (sem indicar se o email existe ou não), para evitar
    // que a resposta seja usada para enumerar contas cadastradas.
    public void forgotPassword(ForgotPasswordRequest request) {
        log.info("Solicitação de reset de senha: email={}", request.getEmail());

        userRepository.findByEmail(request.getEmail()).ifPresentOrElse(user -> {
            if (user.getGoogleId() != null && user.getPassword() == null) {
                log.info("Reset ignorado — conta Google sem senha: email={}", user.getEmail());
                return;
            }

            String token = jwtUtil.generateRefreshToken(); // token opaco aleatório
            user.setResetToken(hashToken(token)); // só o hash é persistido; o token cru vai só no e-mail
            user.setResetTokenExpiry(Instant.now().plusSeconds(1800)); // 30 minutos
            userRepository.save(user);

            // Assíncrono: mantém o tempo de resposta deste branch parecido com o do
            // branch "e-mail não encontrado" (que só loga), fechando o canal de timing.
            emailService.sendPasswordResetEmail(user.getEmail(), token);
            log.info("Token de reset gerado e enviado por e-mail: email={}", user.getEmail());
        }, () -> log.warn("Reset solicitado para email não cadastrado: {}", request.getEmail()));
    }

    public void resetPassword(ResetPasswordRequest request) {
        log.info("Tentativa de reset de senha com token");

        User user = userRepository.findByResetToken(hashToken(request.getToken()))
                .orElseThrow(() -> {
                    log.warn("Reset falhou — token não encontrado");
                    return new IllegalArgumentException("Token inválido.");
                });

        if (user.getResetTokenExpiry() == null || Instant.now().isAfter(user.getResetTokenExpiry())) {
            log.warn("Reset falhou — token expirado: email={}", user.getEmail());
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            userRepository.save(user);
            throw new IllegalArgumentException("Token expirado. Solicite um novo link.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        // Invalida a sessão ativa: se a senha foi resetada por suspeita de conta
        // comprometida, o refresh token antigo não deve continuar válido
        user.setRefreshToken(null);
        user.setRefreshTokenExpiry(null);
        userRepository.save(user);

        log.info("Senha redefinida com sucesso: email={}", user.getEmail());
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken  = jwtUtil.generateToken(user.getEmail());
        String refreshToken = jwtUtil.generateRefreshToken();

        user.setRefreshToken(hashToken(refreshToken)); // só o hash é persistido; o cru vai só na resposta
        user.setRefreshTokenExpiry(jwtUtil.refreshTokenExpiry());
        userRepository.save(user);

        return new AuthResponse(accessToken, refreshToken, user.getName(), user.getEmail());
    }
}
