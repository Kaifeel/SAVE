export type ChatRoom = {
  id: number;
  itemId: number;
  itemTitle: string;
  opponentId: number;
  opponentName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type ChatRoomCreation = {
  id: number;
  itemId: number;
};

export type ChatMessage = {
  id: number;
  roomId: number;
  senderId: number;
  senderName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type ChatMessagePage = {
  messages: ChatMessage[];
  nextBefore: number | null;
  hasMore: boolean;
};

export type ChatReadResult = {
  readCount: number;
};
