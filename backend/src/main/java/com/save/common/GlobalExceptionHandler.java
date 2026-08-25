package com.save.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ApiError> handleBusinessException(BusinessException exception) {
        return ResponseEntity.status(exception.getStatus()).body(ApiError.of(exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidationException(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getDefaultMessage())
                .filter(candidate -> candidate != null && !candidate.isBlank())
                .findFirst()
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.badRequest().body(ApiError.of(message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleUnreadableMessage() {
        return ResponseEntity.badRequest().body(ApiError.of("요청 형식이 올바르지 않습니다."));
    }

    @ExceptionHandler({
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class
    })
    ResponseEntity<ApiError> handleInvalidRequestParameter() {
        return ResponseEntity.badRequest().body(ApiError.of("요청 파라미터가 올바르지 않습니다."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> handleUploadTooLarge() {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiError.of("업로드한 사진의 전체 크기가 허용 범위를 초과했습니다."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> handleMissingResource() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of("요청한 리소스를 찾을 수 없습니다."));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpectedException(Exception exception) {
        log.error("Unhandled server exception", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of("서버 오류가 발생했습니다."));
    }
}
