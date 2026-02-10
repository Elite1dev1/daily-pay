import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { apiService } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

interface AgentInfo {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  assignedContributors: number;
  totalTransactionsHandled: number;
  totalFundsProcessed: number;
  lastActivityTimestamp?: string;
  unreconciledBalance: number;
}

interface AgentActivity {
  agentId: string;
  agentName: string;
  actionType: string;
  resourceType?: string;
  timestamp: string;
  details?: Record<string, any>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

export default function AgentMonitoring() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { isConnected, lastUpdate } = useWebSocket('dashboard');

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (lastUpdate?.type === 'agent') {
      loadAgents();
    }
  }, [lastUpdate]);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentActivity(selectedAgent);
    }
  }, [selectedAgent]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAgentsList();
      setAgents(response.data);
    } catch (error) {
      console.error('Failed to load agents', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentActivity = async (agentId: string) => {
    setActivityLoading(true);
    try {
      const response = await apiService.getAgentActivity(agentId, { limit: 100 });
      setAgentActivity(response.data);
    } catch (error) {
      console.error('Failed to load agent activity', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      !searchTerm ||
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedAgentData = agents.find((a) => a.id === selectedAgent);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Agent Monitoring</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: isConnected ? 'green' : 'red' }}>
            {isConnected ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedAgent ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        {/* Agent Listing */}
        <Card title="Agent Listing">
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', flex: '1', minWidth: '200px' }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading agents...</div>
          ) : filteredAgents.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No agents found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd', background: '#f9fafb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Agent Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>Contributors</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>Transactions</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>Funds Processed</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>Unreconciled</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent) => (
                    <tr
                      key={agent.id}
                      style={{
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        background: selectedAgent === agent.id ? '#f0f9ff' : 'white',
                      }}
                      onClick={() => setSelectedAgent(agent.id)}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{agent.name}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{agent.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            backgroundColor:
                              agent.status === 'Active'
                                ? '#d1fae5'
                                : agent.status === 'Suspended'
                                ? '#fee2e2'
                                : '#f3f4f6',
                            color:
                              agent.status === 'Active'
                                ? '#065f46'
                                : agent.status === 'Suspended'
                                ? '#991b1b'
                                : '#6b7280',
                          }}
                        >
                          {agent.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{agent.assignedContributors}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{agent.totalTransactionsHandled}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                        {formatCurrency(agent.totalFundsProcessed)}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: agent.unreconciledBalance > 0 ? '#dc2626' : '#6b7280',
                        }}
                      >
                        {formatCurrency(agent.unreconciledBalance)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                        {agent.lastActivityTimestamp
                          ? new Date(agent.lastActivityTimestamp).toLocaleString()
                          : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Agent Activity Details */}
        {selectedAgent && selectedAgentData && (
          <Card title={`Activity: ${selectedAgentData.name}`}>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Contributors</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {selectedAgentData.assignedContributors}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Transactions</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {selectedAgentData.totalTransactionsHandled}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Funds Processed</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {formatCurrency(selectedAgentData.totalFundsProcessed)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>Unreconciled Balance</div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: selectedAgentData.unreconciledBalance > 0 ? '#dc2626' : '#6b7280',
                    }}
                  >
                    {formatCurrency(selectedAgentData.unreconciledBalance)}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedAgent(null)}
              style={{
                marginBottom: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              ← Back to List
            </button>

            <h3 style={{ marginBottom: '1rem' }}>Activity Log</h3>
            {activityLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading activity...</div>
            ) : agentActivity.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No activity found</div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {agentActivity.map((activity, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #eee',
                      background: index % 2 === 0 ? 'white' : '#f9fafb',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 'bold' }}>{activity.actionType}</div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {activity.resourceType && (
                      <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                        Resource: {activity.resourceType}
                      </div>
                    )}
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#0369a1' }}>View Details</summary>
                          <pre
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              background: '#f3f4f6',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              overflow: 'auto',
                            }}
                          >
                            {JSON.stringify(activity.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
