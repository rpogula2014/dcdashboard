/**
 * ChatHistory Component
 * Container for managing and displaying conversation messages
 */

import { useRef, useEffect } from 'react';
import { Empty } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import type { ChatMessage as ChatMessageType, FeedbackRating } from '../../types';
import { ChatMessage } from './ChatMessage';
import './TalkToData.css';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  isLoading?: boolean;
  feedbackGiven?: Map<string, FeedbackRating>;
  onFeedbackSubmitted?: (messageId: string, rating: FeedbackRating) => void;
}

export function ChatHistory({
  messages,
  isLoading = false,
  feedbackGiven,
  onFeedbackSubmitted,
}: ChatHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="chat-history-empty">
        <Empty
          image={<MessageOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description={
            <span style={{ color: '#999' }}>
              Ask a question to get started
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="chat-history-container" ref={containerRef}>
      <div className="chat-history-messages">
        {messages.map((message, index) => {
          // Check if this is the last assistant message and we're loading
          const isLastMessage = index === messages.length - 1;
          const isLoadingThisMessage =
            isLoading && isLastMessage && message.role === 'assistant';

          return (
            <ChatMessage
              key={message.id}
              message={message}
              isLoading={isLoadingThisMessage}
              feedbackGiven={feedbackGiven?.get(message.id)}
              onFeedbackSubmitted={onFeedbackSubmitted}
            />
          );
        })}

        {/* Loading placeholder for new assistant message */}
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <ChatMessage
            message={{
              id: 'loading',
              role: 'assistant',
              content: '',
              timestamp: new Date(),
            }}
            isLoading={true}
          />
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default ChatHistory;
