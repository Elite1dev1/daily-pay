import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';

export default function AuditLogs() {
  const [logs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    actionType: '',
    limit: 50,
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    // Note: Audit log API endpoint would need to be added to apiService
    // For now, this is a placeholder
    setLoading(false);
  };

  const columns = [
    { key: 'actionType', header: 'Action' },
    { key: 'actorRole', header: 'Role' },
    { key: 'resourceType', header: 'Resource' },
    { key: 'ipAddress', header: 'IP Address' },
    { key: 'createdAt', header: 'Timestamp', render: (log: any) => new Date(log.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Audit Logs</h2>

      <Card title="Filters" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <Input
            label="Action Type"
            value={filters.actionType}
            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
            placeholder="e.g., DEPOSIT_CREATED"
            style={{ flex: 1 }}
          />
          <Button variant="primary" onClick={loadLogs}>
            Apply Filters
          </Button>
        </div>
      </Card>

      <Card title="Audit Logs">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <Table columns={columns} data={logs} emptyMessage="No audit logs found" />
        )}
      </Card>
    </div>
  );
}
