import { Card, Empty } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

export function CycleCount() {
  return (
    <div className="page-content">
      <Card>
        <Empty
          image={<SyncOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <span>
              <strong>Cycle Counts</strong>
              <br />
              This page will display cycle count schedules and results.
            </span>
          }
        />
      </Card>
    </div>
  );
}

export default CycleCount;
