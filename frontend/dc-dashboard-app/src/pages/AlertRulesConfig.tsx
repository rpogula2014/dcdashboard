/**
 * AlertRulesConfig Page
 * Configure alert rules for exception monitoring
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Space,
  Table,
  Tag,
  Modal,
  message,
  Tabs,
  Tooltip,
  Popconfirm,
  Alert,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  FormOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAlertRules } from '../contexts';
import { validateWhereClause, getDataSourceColumns } from '../services/alertRuleExecutor';
import type { AlertRule, AlertSeverity, AlertDataSource, RuleCondition, RuleOperator } from '../types';

// Available data sources
const DATA_SOURCES: { value: AlertDataSource; label: string }[] = [
  { value: 'dc_order_lines', label: 'Order Lines' },
  { value: 'route_plans', label: 'Route Plans' },
  { value: 'dc_onhand', label: 'On Hand Inventory' },
];

// Fallback columns when DuckDB table isn't loaded yet (based on TypeScript types)
const FALLBACK_COLUMNS: Record<AlertDataSource, { column_name: string; data_type: string }[]> = {
  dc_order_lines: [
    { column_name: 'order_number', data_type: 'INTEGER' },
    { column_name: 'line_id', data_type: 'INTEGER' },
    { column_name: 'ordered_item', data_type: 'VARCHAR' },
    { column_name: 'ordered_quantity', data_type: 'INTEGER' },
    { column_name: 'reserved_qty', data_type: 'INTEGER' },
    { column_name: 'routed', data_type: 'VARCHAR' },
    { column_name: 'planned', data_type: 'VARCHAR' },
    { column_name: 'hold_applied', data_type: 'VARCHAR' },
    { column_name: 'hold_released', data_type: 'VARCHAR' },
    { column_name: 'sold_to', data_type: 'VARCHAR' },
    { column_name: 'ship_to', data_type: 'VARCHAR' },
    { column_name: 'shipping_method_code', data_type: 'VARCHAR' },
    { column_name: 'order_category', data_type: 'VARCHAR' },
    { column_name: 'order_type', data_type: 'VARCHAR' },
    { column_name: 'fulfillment_type', data_type: 'VARCHAR' },
    { column_name: 'schedule_ship_date', data_type: 'VARCHAR' },
    { column_name: 'ordered_date', data_type: 'VARCHAR' },
    { column_name: 'dc', data_type: 'VARCHAR' },
    { column_name: 'iso', data_type: 'VARCHAR' },
    { column_name: 'delivery_id', data_type: 'INTEGER' },
    { column_name: 'trip_id', data_type: 'INTEGER' },
    { column_name: 'header_id', data_type: 'INTEGER' },
    { column_name: 'productgrp', data_type: 'VARCHAR' },
    { column_name: 'vendor', data_type: 'VARCHAR' },
    { column_name: 'localplusqtyexists', data_type: 'VARCHAR' },
    { column_name: 'localplusqty', data_type: 'INTEGER' },
  ],
  route_plans: [
    { column_name: 'route_id', data_type: 'INTEGER' },
    { column_name: 'route_name', data_type: 'VARCHAR' },
    { column_name: 'schedule_key', data_type: 'VARCHAR' },
    { column_name: 'driver_key', data_type: 'VARCHAR' },
    { column_name: 'truck_key', data_type: 'VARCHAR' },
    { column_name: 'process_code', data_type: 'VARCHAR' },
    { column_name: 'trip_id', data_type: 'INTEGER' },
    { column_name: 'route_start_date', data_type: 'VARCHAR' },
    { column_name: 'location_key', data_type: 'VARCHAR' },
    { column_name: 'stop_number', data_type: 'INTEGER' },
    { column_name: 'order_number', data_type: 'VARCHAR' },
    { column_name: 'delivery_id', data_type: 'INTEGER' },
    { column_name: 'quantity', data_type: 'INTEGER' },
  ],
  dc_onhand: [
    { column_name: 'item_number', data_type: 'VARCHAR' },
    { column_name: 'subinventory', data_type: 'VARCHAR' },
    { column_name: 'locator', data_type: 'VARCHAR' },
    { column_name: 'quantity', data_type: 'INTEGER' },
    { column_name: 'uom', data_type: 'VARCHAR' },
  ],
};

// Available operators
const OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'LIKE', label: 'Contains' },
  { value: 'IS NULL', label: 'Is Empty' },
  { value: 'IS NOT NULL', label: 'Is Not Empty' },
];

// Date fields that should show relative date picker
const DATE_FIELDS = [
  'schedule_ship_date',
  'ordered_date',
  'route_start_date',
  'creation_date',
  'last_update_date',
];

// Relative date options for date fields
const RELATIVE_DATE_OPTIONS = [
  { value: '@TODAY', label: 'Today' },
  { value: '@TOMORROW', label: 'Tomorrow' },
  { value: '@YESTERDAY', label: 'Yesterday' },
  { value: '@TODAY-2', label: '2 days ago' },
  { value: '@TODAY-3', label: '3 days ago' },
  { value: '@TODAY-7', label: '7 days ago' },
  { value: '@TODAY+2', label: 'In 2 days' },
  { value: '@TODAY+3', label: 'In 3 days' },
  { value: '@TODAY+7', label: 'In 7 days' },
];

// Severity config with colors
const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; icon: React.ReactNode; label: string }> = {
  critical: { color: '#ff4d4f', icon: <ExclamationCircleOutlined />, label: 'Critical' },
  warning: { color: '#faad14', icon: <WarningOutlined />, label: 'Warning' },
  info: { color: '#1890ff', icon: <InfoCircleOutlined />, label: 'Info' },
};

// Form values type
interface RuleFormValues {
  name: string;
  description?: string;
  severity: AlertSeverity;
  dataSource: AlertDataSource;
  refreshInterval: number;
  enabled: boolean;
  conditions?: RuleCondition[];
  advancedExpression?: string;
}

// Helper to check if a field is a date field
function isDateField(fieldName: string): boolean {
  return DATE_FIELDS.includes(fieldName);
}

// Simple Rule Builder Component
function SimpleRuleBuilder({
  conditions,
  onChange,
  availableColumns,
}: {
  conditions: RuleCondition[];
  onChange: (conditions: RuleCondition[]) => void;
  availableColumns: { column_name: string; data_type: string }[];
}) {
  const addCondition = () => {
    onChange([
      ...conditions,
      { field: availableColumns[0]?.column_name || '', operator: '=', value: '' },
    ]);
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    // Reset value when field changes to/from a date field
    if (updates.field !== undefined) {
      const wasDateField = isDateField(newConditions[index].field);
      const isNowDateField = isDateField(updates.field);
      if (wasDateField !== isNowDateField) {
        newConditions[index].value = '';
      }
    }
    onChange(newConditions);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const columnOptions = availableColumns.map((col) => ({
    value: col.column_name,
    label: `${col.column_name} (${col.data_type})`,
  }));

  // Render value input based on field type
  const renderValueInput = (condition: RuleCondition, index: number) => {
    if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
      return null;
    }

    const fieldIsDate = isDateField(condition.field);

    if (fieldIsDate) {
      return (
        <Select
          value={condition.value as string}
          onChange={(value) => updateCondition(index, { value })}
          style={{ width: 150 }}
          placeholder="Select date"
          options={RELATIVE_DATE_OPTIONS}
          allowClear
        />
      );
    }

    return (
      <Input
        value={condition.value as string}
        onChange={(e) => updateCondition(index, { value: e.target.value })}
        placeholder="Value"
        style={{ width: 150 }}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {conditions.map((condition, index) => (
        <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {index > 0 && (
            <Tag color="blue" style={{ marginRight: 4 }}>AND</Tag>
          )}
          <Select
            value={condition.field}
            onChange={(value) => updateCondition(index, { field: value })}
            style={{ width: 200 }}
            options={columnOptions}
            placeholder="Select field"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            value={condition.operator}
            onChange={(value) => updateCondition(index, { operator: value })}
            style={{ width: 140 }}
            options={OPERATORS}
          />
          {renderValueInput(condition, index)}
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeCondition(index)}
          />
        </div>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={addCondition}
        style={{ width: 'fit-content' }}
      >
        Add Condition
      </Button>
      {conditions.length === 0 && (
        <Alert
          message="No conditions defined. Click 'Add Condition' to start building your rule."
          type="info"
          showIcon
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}

// Advanced Expression Editor Component
function AdvancedExpressionEditor({
  expression,
  onChange,
  dataSource,
  onValidate,
}: {
  expression: string;
  onChange: (expression: string) => void;
  dataSource: AlertDataSource;
  onValidate: (expression: string) => Promise<{ valid: boolean; error?: string }>;
}) {
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    if (!expression.trim()) {
      setValidationResult({ valid: false, error: 'Expression cannot be empty' });
      return;
    }
    setIsValidating(true);
    const result = await onValidate(expression);
    setValidationResult(result);
    setIsValidating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Input.TextArea
        value={expression}
        onChange={(e) => {
          onChange(e.target.value);
          setValidationResult(null);
        }}
        placeholder="Enter SQL WHERE clause, e.g.: routed = 'Y' AND planned = 'N'"
        rows={4}
        style={{ fontFamily: 'monospace' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button onClick={handleValidate} loading={isValidating}>
          Validate Expression
        </Button>
        {validationResult && (
          validationResult.valid ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Valid</Tag>
          ) : (
            <Tag icon={<ExclamationCircleOutlined />} color="error">
              {validationResult.error || 'Invalid'}
            </Tag>
          )
        )}
      </div>
      <Alert
        message="SQL WHERE Clause Syntax"
        description={
          <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 12 }}>
            <li>Use column names from {dataSource} table</li>
            <li>String values: <code>column = 'value'</code></li>
            <li>Number values: <code>quantity &gt; 0</code></li>
            <li>NULL checks: <code>column IS NULL</code> or <code>column IS NOT NULL</code></li>
            <li>Combine with: <code>AND</code>, <code>OR</code></li>
            <li>Pattern match: <code>column LIKE '%pattern%'</code></li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginTop: 8 }}
      />
    </div>
  );
}

// Severity Selector Component (Form.Item compatible)
function SeveritySelector({
  value,
  onChange,
}: {
  value?: AlertSeverity;
  onChange?: (severity: AlertSeverity) => void;
}) {
  const currentValue = value || 'warning';

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {(Object.entries(SEVERITY_CONFIG) as [AlertSeverity, typeof SEVERITY_CONFIG.critical][]).map(
        ([severity, config]) => (
          <Tooltip key={severity} title={config.label}>
            <Button
              type={currentValue === severity ? 'primary' : 'default'}
              icon={config.icon}
              style={{
                borderColor: currentValue === severity ? config.color : undefined,
                backgroundColor: currentValue === severity ? config.color : undefined,
              }}
              onClick={() => onChange?.(severity)}
            >
              {config.label}
            </Button>
          </Tooltip>
        )
      )}
    </div>
  );
}

export function AlertRulesConfig() {
  const { rules, addRule, updateRule, deleteRule, toggleRule, buildWhereClause } = useAlertRules();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [form] = Form.useForm<RuleFormValues>();
  const [builderMode, setBuilderMode] = useState<'simple' | 'advanced'>('simple');
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [advancedExpression, setAdvancedExpression] = useState('');
  const [availableColumns, setAvailableColumns] = useState<{ column_name: string; data_type: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Watch for data source changes to load columns
  const selectedDataSource = Form.useWatch('dataSource', form);

  useEffect(() => {
    if (selectedDataSource) {
      getDataSourceColumns(selectedDataSource).then((cols) => {
        // Use fallback columns if DuckDB table isn't loaded yet
        if (cols.length === 0) {
          setAvailableColumns(FALLBACK_COLUMNS[selectedDataSource] || []);
        } else {
          setAvailableColumns(cols);
        }
      });
    }
  }, [selectedDataSource]);

  // Open modal for creating new rule
  const handleCreate = useCallback(() => {
    setEditingRule(null);
    setBuilderMode('simple');
    setConditions([]);
    setAdvancedExpression('');
    form.resetFields();
    const defaultDataSource: AlertDataSource = 'dc_order_lines';
    form.setFieldsValue({
      severity: 'warning',
      dataSource: defaultDataSource,
      refreshInterval: 60,
      enabled: true,
    });
    // Initialize columns for default data source
    setAvailableColumns(FALLBACK_COLUMNS[defaultDataSource]);
    getDataSourceColumns(defaultDataSource).then((cols) => {
      if (cols.length > 0) {
        setAvailableColumns(cols);
      }
    });
    setIsModalVisible(true);
  }, [form]);

  // Open modal for editing existing rule
  const handleEdit = useCallback((rule: AlertRule) => {
    setEditingRule(rule);
    if (rule.advancedExpression) {
      setBuilderMode('advanced');
      setAdvancedExpression(rule.advancedExpression);
      setConditions([]);
    } else {
      setBuilderMode('simple');
      setConditions(rule.conditions || []);
      setAdvancedExpression('');
    }
    form.setFieldsValue({
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      dataSource: rule.dataSource,
      refreshInterval: rule.refreshInterval,
      enabled: rule.enabled,
    });
    // Initialize columns for rule's data source
    setAvailableColumns(FALLBACK_COLUMNS[rule.dataSource] || []);
    getDataSourceColumns(rule.dataSource).then((cols) => {
      if (cols.length > 0) {
        setAvailableColumns(cols);
      }
    });
    setIsModalVisible(true);
  }, [form]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      // Build rule data
      const ruleData: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        description: values.description,
        severity: values.severity,
        dataSource: values.dataSource,
        refreshInterval: values.refreshInterval,
        enabled: values.enabled,
      };

      // Add conditions or expression based on mode
      if (builderMode === 'advanced') {
        if (!advancedExpression.trim()) {
          message.error('Please enter an expression');
          setIsSubmitting(false);
          return;
        }
        // Validate the expression
        const validation = await validateWhereClause(values.dataSource, advancedExpression);
        if (!validation.valid) {
          message.error(`Invalid expression: ${validation.error}`);
          setIsSubmitting(false);
          return;
        }
        ruleData.advancedExpression = advancedExpression;
      } else {
        if (conditions.length === 0) {
          message.error('Please add at least one condition');
          setIsSubmitting(false);
          return;
        }
        ruleData.conditions = conditions;
      }

      if (editingRule) {
        updateRule(editingRule.id, ruleData);
        message.success('Rule updated successfully');
      } else {
        addRule(ruleData);
        message.success('Rule created successfully');
      }

      setIsModalVisible(false);
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = useCallback((id: string) => {
    deleteRule(id);
    message.success('Rule deleted');
  }, [deleteRule]);

  // Table columns
  const columns: ColumnsType<AlertRule> = useMemo(() => [
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean, record: AlertRule) => (
        <Switch
          checked={enabled}
          onChange={() => toggleRule(record.id)}
          size="small"
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AlertRule) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: AlertSeverity) => {
        const config = SEVERITY_CONFIG[severity];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Data Source',
      dataIndex: 'dataSource',
      key: 'dataSource',
      width: 130,
      render: (ds: AlertDataSource) => {
        const source = DATA_SOURCES.find((s) => s.value === ds);
        return source?.label || ds;
      },
    },
    {
      title: 'Condition',
      key: 'condition',
      ellipsis: true,
      render: (_: unknown, record: AlertRule) => (
        <Tooltip title={buildWhereClause(record)}>
          <code style={{ fontSize: 11, color: '#666' }}>
            {buildWhereClause(record)}
          </code>
        </Tooltip>
      ),
    },
    {
      title: 'Refresh',
      dataIndex: 'refreshInterval',
      key: 'refreshInterval',
      width: 80,
      render: (interval: number) => (
        interval > 0 ? `${interval}s` : 'Manual'
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: AlertRule) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this rule?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ], [buildWhereClause, handleDelete, handleEdit, toggleRule]);

  return (
    <div className="page-content">
      <Card
        title="Alert Rules Configuration"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Rule
          </Button>
        }
      >
        {rules.length > 0 ? (
          <Table
            dataSource={rules}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        ) : (
          <Empty
            description="No alert rules configured"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Create First Rule
            </Button>
          </Empty>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={isSubmitting}
        width={700}
        okText={editingRule ? 'Save' : 'Create'}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            severity: 'warning',
            dataSource: 'dc_order_lines',
            refreshInterval: 60,
            enabled: true,
          }}
        >
          <Form.Item
            name="name"
            label="Rule Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Stuck at Descartes" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input placeholder="Optional description" />
          </Form.Item>

          <Form.Item
            name="severity"
            label="Severity"
            rules={[{ required: true }]}
          >
            <SeveritySelector />
          </Form.Item>

          <Form.Item
            name="dataSource"
            label="Data Source"
            rules={[{ required: true }]}
          >
            <Select options={DATA_SOURCES} />
          </Form.Item>

          <Form.Item label="Rule Condition">
            <Tabs
              activeKey={builderMode}
              onChange={(key) => setBuilderMode(key as 'simple' | 'advanced')}
              items={[
                {
                  key: 'simple',
                  label: (
                    <span>
                      <FormOutlined /> Simple Builder
                    </span>
                  ),
                  children: (
                    <SimpleRuleBuilder
                      conditions={conditions}
                      onChange={setConditions}
                      availableColumns={availableColumns}
                    />
                  ),
                },
                {
                  key: 'advanced',
                  label: (
                    <span>
                      <CodeOutlined /> Advanced SQL
                    </span>
                  ),
                  children: (
                    <AdvancedExpressionEditor
                      expression={advancedExpression}
                      onChange={setAdvancedExpression}
                      dataSource={selectedDataSource || 'dc_order_lines'}
                      onValidate={(expr) => validateWhereClause(selectedDataSource || 'dc_order_lines', expr)}
                    />
                  ),
                },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="refreshInterval"
            label="Refresh Interval (seconds)"
            tooltip="How often to check this rule. Set to 0 for manual refresh only."
          >
            <InputNumber min={0} max={3600} style={{ width: 150 }} />
          </Form.Item>

          <Form.Item name="enabled" label="Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AlertRulesConfig;
