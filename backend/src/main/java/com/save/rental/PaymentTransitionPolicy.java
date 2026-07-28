package com.save.rental;

import com.save.common.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class PaymentTransitionPolicy {
    private final boolean directPaymentAllowed;

    public PaymentTransitionPolicy(
            @Value("${features.direct-payment-transition:true}") boolean directPaymentAllowed) {
        this.directPaymentAllowed = directPaymentAllowed;
    }

    public void assertDirectPaymentAllowed() {
        if (!directPaymentAllowed) {
            throw new BusinessException(HttpStatus.NOT_FOUND,
                    "직접 결제 처리는 개발 환경에서만 사용할 수 있습니다.");
        }
    }
}
