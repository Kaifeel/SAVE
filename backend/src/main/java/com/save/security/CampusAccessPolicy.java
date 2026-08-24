package com.save.security;

import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.user.User;
import com.save.user.UserRepository;
import com.save.user.UserStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class CampusAccessPolicy {
    private final UserRepository userRepository;

    public CampusAccessPolicy(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User requireActiveUser(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED, "다시 로그인해주세요."));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.FORBIDDEN,
                    "정지된 사용자는 서비스에 접근할 수 없습니다.");
        }
        return user;
    }

    public Integer requireCampusId(Integer userId) {
        return requireCampusId(requireActiveUser(userId));
    }

    public Integer requireCampusId(User user) {
        if (user.getUniversity() == null) {
            throw new BusinessException(HttpStatus.FORBIDDEN,
                    "소속 대학을 먼저 설정해주세요.");
        }
        return user.getUniversity().getId();
    }

    public void requireSameCampus(User actor, Item item) {
        requireSameCampus(actor, item.getOwner());
    }

    public void requireSameCampus(User actor, User other) {
        Integer actorCampusId = requireCampusId(actor);
        Integer otherCampusId = other.getUniversity() == null
                ? null : other.getUniversity().getId();
        if (!actorCampusId.equals(otherCampusId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN,
                    "같은 대학 사용자끼리만 이용할 수 있습니다.");
        }
    }
}
