/**
 * TalkToData Component Exports
 */

// Result display components
export { ResultTable } from './ResultTable';
export { ResultChart } from './ResultChart';
export { ResultText } from './ResultText';
export { SQLDisplay } from './SQLDisplay';

// Chat components
export { ChatInput } from './ChatInput';
export { ChatMessage } from './ChatMessage';
export { ChatHistory } from './ChatHistory';
export { ExampleQuestions } from './ExampleQuestions';
export { DataFreshness, DataFreshnessCompact } from './DataFreshness';

// Loading states
export {
  QueryLoading,
  TableSkeleton,
  ChartSkeleton,
  TextSkeleton,
  SQLSkeleton,
  ResultSkeleton,
  StageLoading,
  getLoadingStages,
} from './LoadingStates';

// Result type detection
export {
  detectResultType,
  detectBestChartType,
  shouldShowDualView,
  getDetectionDescription,
} from './resultTypeDetector';
