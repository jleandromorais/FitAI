package com.fitai.fitai_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

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

            // Valida assinatura e expiração do token
            if (jwtUtil.isValid(token)) {
                // Extrai o email do usuário a partir das claims do token
                String email = jwtUtil.extractEmail(token);

                // Carrega os detalhes do usuário (roles, etc.) a partir do email
                var userDetails = userDetailsService.loadUserByUsername(email);

                // Monta o objeto de autenticação do Spring Security.
                // Sem credenciais (null) pois a autenticação já foi feita via JWT,
                // e sem authorities (List.of()) — não há controle de papéis/roles aqui.
                var auth = new UsernamePasswordAuthenticationToken(
                        userDetails, null, List.of());

                // Registra o usuário autenticado no contexto de segurança da requisição atual,
                // permitindo que controllers protegidos identifiquem quem está fazendo a chamada
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        // Independente de haver token válido ou não, continua a cadeia de filtros
        // (se não autenticado, endpoints protegidos vão barrar depois via Spring Security)
        chain.doFilter(request, response);
    }
}
