import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { apiService } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Period = 'daily' | 'weekly' | 'monthly' | 'custom';

interface FinancialSummary {
  totalCollected: number;
  totalReconciled: number;
  outstandingBalance: number;
  totalWithdrawn: number;
  totalDeposits: number;
  totalReversals: number;
}

interface TransactionLog {
  id: string;
  transactionId: string;
  contributorName?: string;
  agentName?: string;
  amount: number;
  paymentStatus: 'Successful' | 'Pending' | 'Failed' | 'Reconciled';
  transactionType: 'Deposit' | 'Withdrawal' | 'Adjustment' | 'Reconciliation';
  dateTime: string;
  reference: string;
}

export default function FinancialDashboard() {
  const [period, setPeriod] = useState<Period>('daily');
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const itemsPerPage = 20;

  const { isConnected, lastUpdate } = useWebSocket('dashboard');

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  useEffect(() => {
    if (lastUpdate?.type === 'financial' || lastUpdate?.type === 'transaction') {
      loadDashboardData();
    }
  }, [lastUpdate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, transactionsRes, analyticsRes] = await Promise.all([
        apiService.getFinancialSummary({ period }),
        apiService.getTransactionLogs({
          period,
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          search: searchTerm || undefined,
        }),
        apiService.getAnalytics({ period }),
      ]);

      setSummary(summaryRes.data);
      setTransactions(transactionsRes.data);
      setTotalTransactions(transactionsRes.pagination?.total || 0);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentPage, statusFilter, typeFilter, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    setCurrentPage(1);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Financial Dashboard</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: isConnected ? 'green' : 'red' }}>
            {isConnected ? '🟢 Live' : '🔴 Offline'}
          </span>
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value as Period)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card title="Total Amount Collected" style={{ background: '#f0f9ff' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0369a1' }}>
            {summary ? formatCurrency(summary.totalCollected) : '₦0.00'}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            All successful deposits
          </div>
        </Card>

        <Card title="Total Amount Reconciled" style={{ background: '#f0fdf4' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#15803d' }}>
            {summary ? formatCurrency(summary.totalReconciled) : '₦0.00'}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            Verified and reconciled
          </div>
        </Card>

        <Card
          title="Outstanding Balance"
          style={{
            background: summary && summary.outstandingBalance > 0 ? '#fef2f2' : '#f9fafb',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: summary && summary.outstandingBalance > 0 ? '#dc2626' : '#6b7280',
            }}
          >
            {summary ? formatCurrency(summary.outstandingBalance) : '₦0.00'}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            {summary && summary.outstandingBalance > 0 ? '⚠️ Discrepancy detected' : 'All reconciled'}
          </div>
        </Card>

        <Card title="Total Withdrawn" style={{ background: '#fff7ed' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ea580c' }}>
            {summary ? formatCurrency(summary.totalWithdrawn) : '₦0.00'}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            All withdrawals
          </div>
        </Card>
      </div>

      {/* Analytics Charts */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <Card title="Revenue Trend">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#0088FE" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Reconciliation Trend">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.reconciliationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#00C49F" name="Reconciled" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Deposit vs Withdrawal">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Deposits', value: analytics.depositVsWithdrawal.deposits },
                { name: 'Withdrawals', value: analytics.depositVsWithdrawal.withdrawals },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Top Contributors">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.contributorPerformance.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="contributorName" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
                <Legend />
                <Bar dataKey="totalDeposited" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Transaction Logs */}
      <Card title="Transaction Logs">
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by transaction ID or reference..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', flex: '1', minWidth: '200px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">All Statuses</option>
            <option value="Successful">Successful</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
            <option value="Reconciled">Reconciled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">All Types</option>
            <option value="Deposit">Deposit</option>
            <option value="Withdrawal">Withdrawal</option>
            <option value="Adjustment">Adjustment</option>
            <option value="Reconciliation">Reconciliation</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No transactions found</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd', background: '#f9fafb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Transaction ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Contributor</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Agent</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>Amount</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Type</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Date & Time</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                        {tx.transactionId.substring(0, 12)}...
                      </td>
                      <td style={{ padding: '0.75rem' }}>{tx.contributorName || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>{tx.agentName || '-'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                        {formatCurrency(tx.amount)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{tx.transactionType}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            backgroundColor:
                              tx.paymentStatus === 'Successful' || tx.paymentStatus === 'Reconciled'
                                ? '#d1fae5'
                                : tx.paymentStatus === 'Pending'
                                ? '#fef3c7'
                                : '#fee2e2',
                            color:
                              tx.paymentStatus === 'Successful' || tx.paymentStatus === 'Reconciled'
                                ? '#065f46'
                                : tx.paymentStatus === 'Pending'
                                ? '#92400e'
                                : '#991b1b',
                          }}
                        >
                          {tx.paymentStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        {new Date(tx.dateTime).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                        {tx.reference.substring(0, 10)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, totalTransactions)} of {totalTransactions} transactions
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: currentPage === 1 ? '#f3f4f6' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage * itemsPerPage >= totalTransactions}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: currentPage * itemsPerPage >= totalTransactions ? '#f3f4f6' : 'white',
                    cursor: currentPage * itemsPerPage >= totalTransactions ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
