package io.git.curation.demo.global.exception;

import io.git.curation.demo.global.response.ErrorResponse;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(PayloadValidationException.class)
  public ResponseEntity<ErrorResponse> handlePayload(PayloadValidationException e) {
    return ResponseEntity.badRequest()
        .body(new ErrorResponse(400, e.getMessage(), e.getErrors()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleBeanValidation(MethodArgumentNotValidException e) {
    List<String> errors =
        e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .toList();
    return ResponseEntity.badRequest().body(new ErrorResponse(400, "요청 검증 실패", errors));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorResponse> handleIllegalArg(IllegalArgumentException e) {
    return ResponseEntity.badRequest().body(new ErrorResponse(400, e.getMessage(), List.of()));
  }
}
