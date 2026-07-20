package com.save.chat.repository;

import com.save.chat.domain.ChatRoom;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Integer> {
    @EntityGraph(attributePaths = {"item", "borrower", "lender"})
    Optional<ChatRoom> findByItemIdAndBorrowerIdAndLenderId(Integer itemId, Integer borrowerId, Integer lenderId);

    @EntityGraph(attributePaths = {"item", "borrower", "lender"})
    List<ChatRoom> findByBorrowerIdOrLenderIdOrderByCreatedAtDesc(Integer borrowerId, Integer lenderId);

    @EntityGraph(attributePaths = {"item", "borrower", "lender"})
    Optional<ChatRoom> findWithMembersById(Integer id);
}
