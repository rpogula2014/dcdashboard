/**
 * ChatInput Component
 * Text input for natural language queries with submit button
 */

import { useState, useRef, useEffect } from 'react';
import { Input, Button, Tooltip } from 'antd';
import { SendOutlined, LoadingOutlined } from '@ant-design/icons';
import './TalkToData.css';

const { TextArea } = Input;

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder = 'Ask a question about your data...',
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = () => {
    const trimmedValue = value.trim();
    if (trimmedValue && !isLoading && !disabled) {
      onSubmit(trimmedValue);
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <TextArea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          autoSize={{ minRows: 1, maxRows: 4 }}
          className="chat-input-textarea"
        />
        <Tooltip title={isLoading ? 'Processing...' : 'Send (Enter)'}>
          <Button
            type="primary"
            icon={isLoading ? <LoadingOutlined spin /> : <SendOutlined />}
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="chat-input-submit"
          />
        </Tooltip>
      </div>
      <div className="chat-input-hint">
        Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line
      </div>
    </div>
  );
}

export default ChatInput;
