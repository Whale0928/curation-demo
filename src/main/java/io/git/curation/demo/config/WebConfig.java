package io.git.curation.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** 데모용 — 별도 정적 서버에서 호출하는 FE를 위해 모든 origin 허용. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**").allowedOriginPatterns("*").allowedMethods("*");
  }
}
