/**
 * ExampleQuestions Component
 * Displays clickable suggested questions for users
 */

import { Typography, Tag } from 'antd';
import {
  QuestionCircleOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ExampleQuestion } from '../../types';
import './TalkToData.css';

const { Text } = Typography;

interface ExampleQuestionsProps {
  onSelect: (question: string) => void;
  compact?: boolean;
}

// Pre-defined example questions
const EXAMPLE_QUESTIONS: ExampleQuestion[] = [
  // Orders category
  {
    text: 'How many orders are on hold?',
    category: 'orders',
    description: 'Count orders with hold applied',
  },
  {
    text: 'Show orders scheduled to ship today',
    category: 'orders',
    description: "Today's shipments",
  },
  {
    text: 'Show me orders over 10 units',
    category: 'orders',
    description: 'Large quantity orders',
  },
  {
    text: 'What are the top 10 customers by order count?',
    category: 'orders',
    description: 'Customer analysis',
  },

  // Routes category
  {
    text: 'How many distinct routes are planned for today?',
    category: 'routes',
    description: 'Route count',
  },
  {
    text: 'Which routes have the most stops?',
    category: 'routes',
    description: 'Route complexity',
  },
  {
    text: 'Show all drivers assigned to routes',
    category: 'routes',
    description: 'Driver assignments',
  },

  // Analysis category
  {
    text: 'What percentage of orders are routed?',
    category: 'analysis',
    description: 'Routing efficiency',
  },
  {
    text: 'Compare orders by shipping method',
    category: 'analysis',
    description: 'Shipping breakdown',
  },
  {
    text: 'Show order distribution by status',
    category: 'analysis',
    description: 'Status overview',
  },

  // Status category
  {
    text: 'Which orders are backordered?',
    category: 'status',
    description: 'Backorder check',
  },
  {
    text: 'Show orders with released holds',
    category: 'status',
    description: 'Released holds',
  },
];

// Category icons and colors
const CATEGORY_CONFIG: Record<
  ExampleQuestion['category'],
  { icon: React.ReactNode; color: string; label: string }
> = {
  orders: { icon: <ShoppingCartOutlined />, color: 'blue', label: 'Orders' },
  routes: { icon: <TruckOutlined />, color: 'green', label: 'Routes' },
  analysis: { icon: <BarChartOutlined />, color: 'purple', label: 'Analysis' },
  status: { icon: <ClockCircleOutlined />, color: 'orange', label: 'Status' },
};

/**
 * Single example question item
 */
function QuestionItem({
  question,
  onSelect,
  compact,
}: {
  question: ExampleQuestion;
  onSelect: (q: string) => void;
  compact?: boolean;
}) {
  const config = CATEGORY_CONFIG[question.category];

  if (compact) {
    return (
      <Tag
        className="example-question-tag"
        onClick={() => onSelect(question.text)}
        icon={config.icon}
        color={config.color}
      >
        {question.text}
      </Tag>
    );
  }

  return (
    <div
      className="example-question-item"
      onClick={() => onSelect(question.text)}
    >
      <div className="example-question-icon" style={{ color: `var(--ant-color-${config.color})` }}>
        {config.icon}
      </div>
      <div className="example-question-content">
        <Text className="example-question-text">{question.text}</Text>
        {question.description && (
          <Text type="secondary" className="example-question-description">
            {question.description}
          </Text>
        )}
      </div>
    </div>
  );
}

export function ExampleQuestions({ onSelect, compact = false }: ExampleQuestionsProps) {
  // Group questions by category for non-compact view
  const questionsByCategory = EXAMPLE_QUESTIONS.reduce(
    (acc, q) => {
      if (!acc[q.category]) {
        acc[q.category] = [];
      }
      acc[q.category].push(q);
      return acc;
    },
    {} as Record<ExampleQuestion['category'], ExampleQuestion[]>
  );

  if (compact) {
    // Show random selection of questions as tags
    const selectedQuestions = EXAMPLE_QUESTIONS.slice(0, 6);

    return (
      <div className="example-questions-compact">
        <Text type="secondary" style={{ marginRight: 8 }}>
          <QuestionCircleOutlined style={{ marginRight: 4 }} />
          Try asking:
        </Text>
        <div className="example-questions-tags">
          {selectedQuestions.map((q, index) => (
            <QuestionItem
              key={index}
              question={q}
              onSelect={onSelect}
              compact
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="example-questions-container">
      <div className="example-questions-header">
        <QuestionCircleOutlined style={{ marginRight: 8 }} />
        <Text strong>Example Questions</Text>
      </div>
      <div className="example-questions-grid">
        {Object.entries(questionsByCategory).map(([category, questions]) => (
          <div key={category} className="example-questions-category">
            <div className="example-questions-category-header">
              <Tag color={CATEGORY_CONFIG[category as ExampleQuestion['category']].color}>
                {CATEGORY_CONFIG[category as ExampleQuestion['category']].icon}
                <span style={{ marginLeft: 4 }}>
                  {CATEGORY_CONFIG[category as ExampleQuestion['category']].label}
                </span>
              </Tag>
            </div>
            <div className="example-questions-list">
              {questions.slice(0, 3).map((q, index) => (
                <QuestionItem key={index} question={q} onSelect={onSelect} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExampleQuestions;
