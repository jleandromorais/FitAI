package com.fitai.fitai_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtFilter.class);

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        // Lê o header "Authorization" da requisição (ex: "Bearer eyJhbGciOi...")
        String header = request.getHeader("Authorization");

        // Só processa se o header existir e seguir o padrão "Bearer <token>"
        if (header != null && header.startsWith("Bearer ")) {
            // Remove o prefixo "Bearer " (7 caracteres) para extrair só o token JWT
            String token = header.substring(7);

            // Parsing único (assinatura + expiração + subject) — evita reparsear o
            // token duas vezes e a janela de expiração entre validar e extrair
            Optional<String> email = jwtUtil.extractEmailIfValid(token);

            if (email.isPresent()) {
                try {
                    // Carrega os detalhes do usuário (roles, etc.) a partir do email
                    var userDetails = userDetailsService.loadUserByUsername(email.get());

                    // Monta o objeto de autenticação do Spring Security.
                    // Sem credenciais (null) pois a autenticação já foi feita via JWT.
                    // Usa as authorities reais do usuário — necessário pra qualquer
                    // controle de papéis/roles (@PreAuthorize etc.) funcionar.
                    var auth = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());

                    // Registra o usuário autenticado no contexto de segurança da requisição atual,
                    // permitindo que controllers protegidos identifiquem quem está fazendo a chamada
                    SecurityContextHolder.getContext().setAuthentication(auth);
                } catch (UsernameNotFoundException e) {
                    // Token assinado corretamente mas o usuário não existe mais
                    // (conta deletada após o token ser emitido) — segue sem autenticar,
                    // em vez de deixar a exceção estourar cru pelo filtro.
                    log.warn("JWT válido para usuário inexistente: email={}", email.get());
                }
            }
        }

        // Independente de haver token válido ou não, continua a cadeia de filtros
        // (se não autenticado, endpoints protegidos vão barrar depois via Spring Security)
        chain.doFilter(request, response);
    }
}
