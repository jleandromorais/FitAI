package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.AuthResponse;
import com.fitai.fitai_backend.dto.ForgotPasswordRequest;
import com.fitai.fitai_backend.dto.LoginRequest;
import com.fitai.fitai_backend.dto.RefreshRequest;
import com.fitai.fitai_backend.dto.RegisterRequest;
import com.fitai.fitai_backend.dto.ResetPasswordRequest;
import com.fitai.fitai_backend.event.AuditEventPublisher;
import com.fitai.fitai_backend.model.User;
import com.fitai.fitai_backend.repository.UserRepository;
import com.fitai.fitai_backend.security.JwtUtil;
import com.fitai.fitai_backend.service.GoogleTokenVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository       userRepository;
    @Mock PasswordEncoder      passwordEncoder;
    @Mock JwtUtil              jwtUtil;
    @Mock GoogleTokenVerifier  googleTokenVerifier;
    @Mock EmailService         emailService;
    @Mock AuditEventPublisher  auditEventPublisher;

    @InjectMocks AuthService authService;

    // Stubs comuns configurados por teste para evitar UnnecessaryStubbingException
    private void stubTokenGeneration() {
        when(jwtUtil.generateToken(anyString())).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken()).thenReturn("refresh-token");
        when(jwtUtil.refreshTokenExpiry()).thenReturn(Instant.now().plusSeconds(604_800));
    }

    // ── register ──────────────────────────────────────────────────────────────

    @Test
    void register_emailNovo_deveSalvarERetornarTokens() {
        stubTokenGeneration();
        when(userRepository.existsByEmail("novo@test.com")).thenReturn(false);
        when(passwordEncoder.encode("senha123")).thenReturn("hash");
        User saved = User.builder().id(1L).name("Novo").email("novo@test.com").password("hash").build();
        when(userRepository.save(any())).thenReturn(saved);

        AuthResponse res = authService.register(buildRegisterRequest("Novo", "novo@test.com", "senha123"));

        assertThat(res.getToken()).isEqualTo("access-token");
        assertThat(res.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(res.getEmail()).isEqualTo("novo@test.com");
    }

    @Test
    void register_emailJaCadastrado_deveLancarIllegalArgument() {
        when(userRepository.existsByEmail("existente@test.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                buildRegisterRequest("X", "existente@test.com", "senha123")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email já cadastrado");
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Test
    void login_credenciaisCorretas_deveRetornarTokens() {
        stubTokenGeneration();
        User user = User.builder().name("Ana").email("ana@test.com").password("hash").build();
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("senha123", "hash")).thenReturn(true);
        when(userRepository.save(any())).thenReturn(user);

        AuthResponse res = authService.login(buildLoginRequest("ana@test.com", "senha123"));

        assertThat(res.getToken()).isEqualTo("access-token");
        assertThat(res.getRefreshToken()).isEqualTo("refresh-token");
    }

    @Test
    void login_emailNaoEncontrado_deveLancarBadCredentials() {
        when(userRepository.findByEmail("naoexiste@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(buildLoginRequest("naoexiste@test.com", "senha")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_senhaErrada_deveLancarBadCredentials() {
        User user = User.builder().email("ana@test.com").password("hash").build();
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("senhaErrada", "hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(buildLoginRequest("ana@test.com", "senhaErrada")))
                .isInstanceOf(BadCredentialsException.class);
    }

    // ── refresh ───────────────────────────────────────────────────────────────

    @Test
    void refresh_tokenValido_deveEmitirNovoPar() {
        stubTokenGeneration();
        User user = User.builder().name("Ana").email("ana@test.com")
                .refreshToken(AuthService.hashToken("refresh-token"))
                .refreshTokenExpiry(Instant.now().plusSeconds(3600))
                .build();
        when(userRepository.findByRefreshToken(AuthService.hashToken("refresh-token"))).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);

        AuthResponse res = authService.refresh(buildRefreshRequest("refresh-token"));

        assertThat(res.getToken()).isEqualTo("access-token");
        assertThat(res.getRefreshToken()).isEqualTo("refresh-token");
    }

    @Test
    void refresh_tokenInexistente_deveLancarBadCredentials() {
        when(userRepository.findByRefreshToken(AuthService.hashToken("token-invalido"))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(buildRefreshRequest("token-invalido")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("inválido");
    }

    @Test
    void refresh_tokenExpirado_deveLancarBadCredentialsEInvalidarToken() {
        User user = User.builder().name("Ana").email("ana@test.com")
                .refreshToken(AuthService.hashToken("expirado"))
                .refreshTokenExpiry(Instant.now().minusSeconds(1))
                .build();
        when(userRepository.findByRefreshToken(AuthService.hashToken("expirado"))).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.refresh(buildRefreshRequest("expirado")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("expirado");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getRefreshToken()).isNull();
        assertThat(captor.getValue().getRefreshTokenExpiry()).isNull();
    }

    // ── forgotPassword ───────────────────────────────────────────────────────

    @Test
    void forgotPassword_emailExiste_deveGerarTokenEEnviarEmail() {
        User user = User.builder().email("ana@test.com").password("hash").build();
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateRefreshToken()).thenReturn("reset-token");

        authService.forgotPassword(buildForgotPasswordRequest("ana@test.com"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getResetToken()).isEqualTo(AuthService.hashToken("reset-token"));
        assertThat(captor.getValue().getResetTokenExpiry()).isAfter(Instant.now());
        verify(emailService).sendPasswordResetEmail("ana@test.com", "reset-token");
    }

    @Test
    void forgotPassword_emailNaoExiste_naoDeveLancarNemEnviarEmail() {
        when(userRepository.findByEmail("naoexiste@test.com")).thenReturn(Optional.empty());

        assertThatCode(() -> authService.forgotPassword(buildForgotPasswordRequest("naoexiste@test.com")))
                .doesNotThrowAnyException();

        verify(userRepository, never()).save(any());
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
    }

    @Test
    void forgotPassword_contaGoogleSemSenha_naoDeveGerarTokenNemEnviarEmail() {
        User user = User.builder().email("google@test.com").googleId("g-123").password(null).build();
        when(userRepository.findByEmail("google@test.com")).thenReturn(Optional.of(user));

        assertThatCode(() -> authService.forgotPassword(buildForgotPasswordRequest("google@test.com")))
                .doesNotThrowAnyException();

        verify(userRepository, never()).save(any());
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
    }

    // ── resetPassword ────────────────────────────────────────────────────────

    @Test
    void resetPassword_tokenValido_deveAtualizarSenhaELimparToken() {
        User user = User.builder().email("ana@test.com")
                .resetToken(AuthService.hashToken("valid-token"))
                .resetTokenExpiry(Instant.now().plusSeconds(600))
                .build();
        when(userRepository.findByResetToken(AuthService.hashToken("valid-token"))).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("novaSenha123")).thenReturn("novo-hash");

        authService.resetPassword(buildResetPasswordRequest("valid-token", "novaSenha123"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPassword()).isEqualTo("novo-hash");
        assertThat(captor.getValue().getResetToken()).isNull();
        assertThat(captor.getValue().getResetTokenExpiry()).isNull();
    }

    @Test
    void resetPassword_tokenInexistente_deveLancarIllegalArgument() {
        when(userRepository.findByResetToken(AuthService.hashToken("invalido"))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword(buildResetPasswordRequest("invalido", "novaSenha")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Token inválido");
    }

    @Test
    void resetPassword_tokenExpirado_deveLancarIllegalArgumentELimparToken() {
        User user = User.builder().email("ana@test.com")
                .resetToken(AuthService.hashToken("expirado"))
                .resetTokenExpiry(Instant.now().minusSeconds(1))
                .build();
        when(userRepository.findByResetToken(AuthService.hashToken("expirado"))).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.resetPassword(buildResetPasswordRequest("expirado", "novaSenha")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("expirado");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getResetToken()).isNull();
        assertThat(captor.getValue().getResetTokenExpiry()).isNull();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private ForgotPasswordRequest buildForgotPasswordRequest(String email) {
        ForgotPasswordRequest r = new ForgotPasswordRequest();
        setField(r, "email", email);
        return r;
    }

    private ResetPasswordRequest buildResetPasswordRequest(String token, String newPassword) {
        ResetPasswordRequest r = new ResetPasswordRequest();
        setField(r, "token", token);
        setField(r, "newPassword", newPassword);
        return r;
    }

    private RegisterRequest buildRegisterRequest(String name, String email, String password) {
        RegisterRequest r = new RegisterRequest();
        setField(r, "name", name);
        setField(r, "email", email);
        setField(r, "password", password);
        return r;
    }

    private LoginRequest buildLoginRequest(String email, String password) {
        LoginRequest r = new LoginRequest();
        setField(r, "email", email);
        setField(r, "password", password);
        return r;
    }

    private RefreshRequest buildRefreshRequest(String token) {
        RefreshRequest r = new RefreshRequest();
        setField(r, "refreshToken", token);
        return r;
    }

    private void setField(Object obj, String fieldName, String value) {
        try {
            var field = obj.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(obj, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
