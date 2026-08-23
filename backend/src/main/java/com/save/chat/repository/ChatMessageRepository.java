package com.save.chat.repository;

import com.save.chat.domain.ChatMessage;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Integer> {
    @EntityGraph(attributePaths = "sender")
    List<ChatMessage> findByChatRoomIdOrderByIdDesc(Integer roomId, Pageable pageable);

    @EntityGraph(attributePaths = "sender")
    List<ChatMessage> findByChatRoomIdAndIdLessThanOrderByIdDesc(
            Integer roomId, Integer before, Pageable pageable);

    Optional<ChatMessage> findFirstByChatRoomIdOrderByCreatedAtDesc(Integer roomId);

    long countByChatRoomIdAndSenderIdNotAndReadFalse(Integer roomId, Integer userId);

    @Modifying(clearAutomatically = true)
    @Query("""
        update ChatMessage m set m.read = true
        where m.chatRoom.id = :roomId and m.sender.id <> :userId and m.read = false
        """)
    int markAsRead(@Param("roomId") Integer roomId, @Param("userId") Integer userId);
}
