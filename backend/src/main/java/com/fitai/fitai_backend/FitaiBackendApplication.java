package com.fitai.fitai_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class FitaiBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(FitaiBackendApplication.class, args);
	}

}
