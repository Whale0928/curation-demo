package io.git.curation.demo.exception;

import java.util.List;
import lombok.Getter;

@Getter
public class PayloadValidationException extends RuntimeException {

  private final List<String> errors;

  public PayloadValidationException(List<String> errors) {
    super("payload 검증 실패");
    this.errors = errors;
  }
}
