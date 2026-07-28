package com.save.rental;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.save.common.BusinessException;
import org.junit.jupiter.api.Test;

class PaymentTransitionPolicyTest {
    @Test
    void productionRejectsDirectPaidTransition() {
        PaymentTransitionPolicy policy = new PaymentTransitionPolicy(false);

        assertThatThrownBy(policy::assertDirectPaymentAllowed)
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("결제");
    }

    @Test
    void developmentAllowsDirectPaidTransition() {
        PaymentTransitionPolicy policy = new PaymentTransitionPolicy(true);

        assertThatCode(policy::assertDirectPaymentAllowed).doesNotThrowAnyException();
    }
}
