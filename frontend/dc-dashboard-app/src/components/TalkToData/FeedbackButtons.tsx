/**
 * FeedbackButtons Component
 * Thumbs up/down buttons with optional text feedback for AI responses
 *
 * Note: This component only updates feedback on existing metrics records.
 * Metrics are logged separately when AI response is received (in TalkToData page).
 */

import { useState } from 'react';
import { Button, Input, Space, message } from 'antd';
import { LikeOutlined, DislikeOutlined, LikeFilled, DislikeFilled, CheckOutlined } from '@ant-design/icons';
import type { FeedbackRating } from '../../types';
import { updateFeedback } from '../../services/feedbackService';
import './TalkToData.css';

const { TextArea } = Input;

interface FeedbackButtonsProps {
  messageId: string;
  onFeedbackSubmitted?: (messageId: string, rating: FeedbackRating) => void;
}

export function FeedbackButtons({
  messageId,
  onFeedbackSubmitted,
}: FeedbackButtonsProps) {
  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRatingClick = async (rating: FeedbackRating) => {
    if (isSubmitted || isSubmitting) return;

    setSelectedRating(rating);
    setShowTextInput(true);
  };

  const handleSubmit = async () => {
    if (!selectedRating || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateFeedback(messageId, {
        rating: selectedRating,
        feedback_text: feedbackText.trim() || undefined,
      });

      setIsSubmitted(true);
      setShowTextInput(false);
      message.success('Thanks for your feedback!');
      onFeedbackSubmitted?.(messageId, selectedRating);
    } catch (error) {
      console.error('Failed to update feedback:', error);
      message.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipText = async () => {
    // Submit without text feedback
    await handleSubmit();
  };

  // Already submitted - show thank you state
  if (isSubmitted) {
    return (
      <div className="feedback-buttons feedback-submitted">
        <CheckOutlined style={{ color: '#52c41a', marginRight: 4 }} />
        <span className="feedback-thanks">Thanks!</span>
        {selectedRating === 'good' ? (
          <LikeFilled style={{ color: '#52c41a', marginLeft: 4 }} />
        ) : (
          <DislikeFilled style={{ color: '#ff4d4f', marginLeft: 4 }} />
        )}
      </div>
    );
  }

  return (
    <div className="feedback-buttons">
      {!showTextInput ? (
        // Rating buttons
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={selectedRating === 'good' ? <LikeFilled /> : <LikeOutlined />}
            onClick={() => handleRatingClick('good')}
            className={`feedback-btn feedback-btn-good ${selectedRating === 'good' ? 'selected' : ''}`}
            disabled={isSubmitting}
          />
          <Button
            type="text"
            size="small"
            icon={selectedRating === 'bad' ? <DislikeFilled /> : <DislikeOutlined />}
            onClick={() => handleRatingClick('bad')}
            className={`feedback-btn feedback-btn-bad ${selectedRating === 'bad' ? 'selected' : ''}`}
            disabled={isSubmitting}
          />
        </Space>
      ) : (
        // Text feedback input
        <div className="feedback-text-container">
          <TextArea
            placeholder="Any additional feedback? (optional)"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            autoSize={{ minRows: 1, maxRows: 3 }}
            className="feedback-textarea"
            disabled={isSubmitting}
          />
          <Space size="small" className="feedback-actions">
            <Button
              size="small"
              onClick={handleSkipText}
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              Submit
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
}

export default FeedbackButtons;
