package com.fitai.fitai_backend.security;

import com.fitai.fitai_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .map(user -> org.springframework.security.core.userdetails.User
                        .withUsername(user.getEmail())
                        // Contas só-Google não têm senha local; o builder do Spring Security
                        // exige um valor não-nulo, mas esse UserDetails nunca é usado para
                        // checar senha (autenticação já foi feita via JWT ou Google)
                        .password(user.getPassword() != null ? user.getPassword() : "")
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));
    }
}
