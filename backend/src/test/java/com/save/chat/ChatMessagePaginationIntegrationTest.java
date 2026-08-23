package com.save.chat;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.chat.domain.ChatMessage;
import com.save.chat.domain.ChatRoom;
import com.save.chat.repository.ChatMessageRepository;
import com.save.chat.repository.ChatRoomRepository;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.user.User;
import com.save.user.UserRepository;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ChatMessagePaginationIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired ItemRepository itemRepository;
    @Autowired ChatRoomRepository roomRepository;
    @Autowired ChatMessageRepository messageRepository;

    @Test
    void pagesMessagesByIdCursorWithoutOverlapAndRejectsNonparticipants() throws Exception {
        User lender = userRepository.save(new User("대여자"));
        User borrower = userRepository.save(new User("차용자"));
        User outsider = userRepository.save(new User("외부인"));
        Item item = itemRepository.save(new Item("테스트 물품", lender));
        ChatRoom room = roomRepository.save(new ChatRoom(item, borrower, lender));

        List<Integer> ids = new ArrayList<>();
        for (int number = 1; number <= 5; number++) {
            ids.add(messageRepository.save(
                    new ChatMessage(room, borrower, "message-" + number)).getId());
        }

        MvcResult firstResult = mockMvc.perform(get(
                        "/api/v1/chats/rooms/{roomId}/messages", room.getId())
                        .with(jwt().jwt(token -> token.subject(borrower.getId().toString())))
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[0].id").value(ids.get(3)))
                .andExpect(jsonPath("$.messages[1].id").value(ids.get(4)))
                .andExpect(jsonPath("$.has_more").value(true))
                .andExpect(jsonPath("$.next_before").value(ids.get(3)))
                .andReturn();

        JsonNode firstPage = objectMapper.readTree(firstResult.getResponse().getContentAsString());
        String nextBefore = firstPage.get("next_before").asText();
        mockMvc.perform(get("/api/v1/chats/rooms/{roomId}/messages", room.getId())
                        .with(jwt().jwt(token -> token.subject(borrower.getId().toString())))
                        .param("size", "2")
                        .param("before", nextBefore))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[0].id").value(ids.get(1)))
                .andExpect(jsonPath("$.messages[1].id").value(ids.get(2)))
                .andExpect(jsonPath("$.has_more").value(true))
                .andExpect(jsonPath("$.next_before").value(ids.get(1)));

        mockMvc.perform(get("/api/v1/chats/rooms/{roomId}/messages", room.getId())
                        .with(jwt().jwt(token -> token.subject(outsider.getId().toString())))
                        .param("size", "2"))
                .andExpect(status().isForbidden());
    }
}
