package com.fitai.fitai_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.kafka.autoconfigure.ConcurrentKafkaListenerContainerFactoryConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;

/*
 * Kafka é opcional neste projeto: sem KAFKA_BOOTSTRAP_SERVERS configurado, o
 * producer (AuditEventPublisher / WorkoutGenerationEventPublisher) já degrada
 * pra um warning logado, sem derrubar a aplicação (ver comentário em
 * application.properties). Sem esta configuração, o container do
 * @KafkaListener (WorkoutGenerationResultListener) quebraria essa mesma
 * promessa: diferente do producer, o container tenta abrir um Consumer real
 * já durante o startup do contexto (é um SmartLifecycle), e bootstrap.servers
 * vazio derruba a aplicação inteira com ConfigException em vez de só logar.
 *
 * Aqui replicamos a fábrica default que o Spring Boot criaria sozinho
 * (usando o mesmo ConcurrentKafkaListenerContainerFactoryConfigurer
 * autoconfigurado) e só ligamos autoStartup quando bootstrap-servers está de
 * fato configurado — mesmo em testes (H2 + publisher mockado, sem broker
 * nenhum), o contexto sobe normalmente com o listener simplesmente parado.
 */
@Configuration
public class KafkaListenerConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<Object, Object> kafkaListenerContainerFactory(
            ConcurrentKafkaListenerContainerFactoryConfigurer configurer,
            ConsumerFactory<Object, Object> consumerFactory,
            @Value("${spring.kafka.bootstrap-servers:}") String bootstrapServers) {
        ConcurrentKafkaListenerContainerFactory<Object, Object> factory = new ConcurrentKafkaListenerContainerFactory<>();
        configurer.configure(factory, consumerFactory);
        factory.setAutoStartup(bootstrapServers != null && !bootstrapServers.isBlank());
        return factory;
    }
}
