package com.save.review;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

public final class ReviewPolicy {

    // 후기 작성 기한을 변경하려면 이 값을 수정하세요.
    public static final int SUBMISSION_DEADLINE_DAYS = 7;

    private ReviewPolicy() {}

    public static Instant submissionDeadline(Instant returnedAt) {
        return returnedAt.plus(SUBMISSION_DEADLINE_DAYS, ChronoUnit.DAYS);
    }
}
