import mongoose from 'mongoose';
import { LedgerEvent } from '../models/LedgerEvent';
import { AgentReconciliation } from '../models/AgentReconciliation';
import { User } from '../models/User';
import { Contributor } from '../models/Contributor';
import { AuditLog } from '../models/AuditLog';
import { getAgentUnreconciledBalance } from '../database/helpers';
import { getContributorBalance } from '../database/helpers';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface FinancialSummary {
  totalCollected: number;
  totalReconciled: number;
  outstandingBalance: number;
  totalWithdrawn: number;
  totalDeposits: number;
  totalReversals: number;
}

export interface TransactionLog {
  id: string;
  transactionId: string;
  contributorId?: string;
  contributorName?: string;
  agentId?: string;
  agentName?: string;
  amount: number;
  paymentStatus: 'Successful' | 'Pending' | 'Failed' | 'Reconciled';
  transactionType: 'Deposit' | 'Withdrawal' | 'Adjustment' | 'Reconciliation';
  dateTime: string;
  reference: string;
  description?: string;
}

export interface ContributorTransactionView {
  contributorId: string;
  contributorName: string;
  totalDeposited: number;
  totalReconciled: number;
  totalWithdrawn: number;
  currentBalance: number;
  transactions: TransactionLog[];
}

export interface AgentInfo {
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

export interface AgentActivity {
  agentId: string;
  agentName: string;
  actionType: string;
  resourceType?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface AnalyticsData {
  revenueTrend: Array<{ date: string; amount: number }>;
  reconciliationTrend: Array<{ date: string; amount: number }>;
  depositVsWithdrawal: {
    deposits: number;
    withdrawals: number;
  };
  contributorPerformance: Array<{
    contributorId: string;
    contributorName: string;
    totalDeposited: number;
    transactionCount: number;
  }>;
}

/**
 * Get date range filter based on period
 */
function getDateRange(period: 'daily' | 'weekly' | 'monthly' | 'custom', customRange?: DateRange): DateRange {
  const now = new Date();
  const range: DateRange = {};

  switch (period) {
    case 'daily':
      range.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      range.endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      range.startDate = new Date(now);
      range.startDate.setDate(now.getDate() - daysToMonday);
      range.startDate.setHours(0, 0, 0, 0);
      range.endDate = new Date(range.startDate);
      range.endDate.setDate(range.startDate.getDate() + 6);
      range.endDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      range.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      range.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'custom':
      if (customRange?.startDate && customRange?.endDate) {
        range.startDate = customRange.startDate;
        range.endDate = customRange.endDate;
      }
      break;
  }

  return range;
}

/**
 * Check if transaction is reconciled
 */
async function isTransactionReconciled(
  transaction: any,
  agentId?: mongoose.Types.ObjectId
): Promise<boolean> {
  if (!agentId) return false;

  const latestReconciliation = await AgentReconciliation.findOne({
    agentId,
    status: 'APPROVED',
  }).sort({ reconciledAt: -1 });

  if (!latestReconciliation?.reconciledAt) {
    return false;
  }

  return transaction.createdAt < latestReconciliation.reconciledAt;
}

/**
 * Get financial summary metrics
 */
export async function getFinancialSummary(
  period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
  customRange?: DateRange
): Promise<FinancialSummary> {
  const dateRange = getDateRange(period, customRange);
  const matchStage: any = {
    synced: true,
    eventType: { $in: ['DEPOSIT', 'WITHDRAWAL', 'REVERSAL'] },
  };

  if (dateRange.startDate && dateRange.endDate) {
    matchStage.createdAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate,
    };
  }

  // Get all transactions in period
  const transactions = await LedgerEvent.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$eventType',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const deposits = transactions.find((t) => t._id === 'DEPOSIT')?.total || 0;
  const withdrawals = transactions.find((t) => t._id === 'WITHDRAWAL')?.total || 0;
  const reversals = transactions.find((t) => t._id === 'REVERSAL')?.total || 0;

  // Get total reconciled amount (sum of all approved reconciliations in period)
  const reconciliationMatch: any = {
    status: 'APPROVED',
  };

  if (dateRange.startDate && dateRange.endDate) {
    reconciliationMatch.reconciledAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate,
    };
  }

  const reconciliations = await AgentReconciliation.aggregate([
    { $match: reconciliationMatch },
    {
      $group: {
        _id: null,
        totalReconciled: { $sum: '$reconciledAmount' },
      },
    },
  ]);

  const totalReconciled = reconciliations[0]?.totalReconciled || 0;
  const totalCollected = deposits;
  const outstandingBalance = totalCollected - totalReconciled;

  return {
    totalCollected,
    totalReconciled,
    outstandingBalance,
    totalWithdrawn: withdrawals,
    totalDeposits: deposits,
    totalReversals: reversals,
  };
}

/**
 * Get transaction logs with filtering
 */
export async function getTransactionLogs(
  period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
  customRange?: DateRange,
  filters?: {
    status?: string;
    type?: string;
    contributorId?: string;
    agentId?: string;
    search?: string;
  },
  pagination?: { limit: number; offset: number }
): Promise<{ transactions: TransactionLog[]; total: number }> {
  const dateRange = getDateRange(period, customRange);
  const limit = pagination?.limit || 50;
  const offset = pagination?.offset || 0;

  const matchStage: any = {
    synced: true,
  };

  if (dateRange.startDate && dateRange.endDate) {
    matchStage.createdAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate,
    };
  }

  if (filters?.type) {
    const typeMap: Record<string, string[]> = {
      Deposit: ['DEPOSIT'],
      Withdrawal: ['WITHDRAWAL'],
      Adjustment: ['REVERSAL'],
      Reconciliation: ['RECONCILIATION'],
    };
    matchStage.eventType = { $in: typeMap[filters.type] || [] };
  } else {
    matchStage.eventType = { $in: ['DEPOSIT', 'WITHDRAWAL', 'REVERSAL', 'RECONCILIATION'] };
  }

  if (filters?.contributorId) {
    matchStage.contributorId = new mongoose.Types.ObjectId(filters.contributorId);
  }

  if (filters?.agentId) {
    matchStage.agentId = new mongoose.Types.ObjectId(filters.agentId);
  }

  if (filters?.search) {
    matchStage.$or = [
      { referenceId: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const [transactions, total] = await Promise.all([
    LedgerEvent.find(matchStage)
      .populate('contributorId', 'fullName')
      .populate('agentId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean(),
    LedgerEvent.countDocuments(matchStage),
  ]);

  // Process transactions to determine status and format
  const processedTransactions: TransactionLog[] = await Promise.all(
    transactions.map(async (tx: any) => {
      const isReconciled = await isTransactionReconciled(tx, tx.agentId);
      
      let paymentStatus: 'Successful' | 'Pending' | 'Failed' | 'Reconciled';
      if (isReconciled) {
        paymentStatus = 'Reconciled';
      } else if (tx.synced) {
        paymentStatus = 'Successful';
      } else {
        paymentStatus = 'Pending';
      }

      const typeMap: Record<string, 'Deposit' | 'Withdrawal' | 'Adjustment' | 'Reconciliation'> = {
        DEPOSIT: 'Deposit',
        WITHDRAWAL: 'Withdrawal',
        REVERSAL: 'Adjustment',
        RECONCILIATION: 'Reconciliation',
      };

      return {
        id: tx._id.toString(),
        transactionId: tx.referenceId,
        contributorId: tx.contributorId?._id?.toString(),
        contributorName: tx.contributorId?.fullName,
        agentId: tx.agentId?._id?.toString(),
        agentName: tx.agentId?.fullName,
        amount: tx.amount,
        paymentStatus,
        transactionType: typeMap[tx.eventType] || 'Deposit',
        dateTime: tx.createdAt.toISOString(),
        reference: tx.referenceId,
        description: tx.metadata?.description || '',
      };
    })
  );

  // Apply status filter if provided
  let filteredTransactions = processedTransactions;
  if (filters?.status) {
    filteredTransactions = processedTransactions.filter((tx) => tx.paymentStatus === filters.status);
  }

  return {
    transactions: filteredTransactions,
    total: filters?.status ? filteredTransactions.length : total,
  };
}

/**
 * Get contributor transaction view
 */
export async function getContributorTransactionView(
  contributorId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
  customRange?: DateRange
): Promise<ContributorTransactionView> {
  const contributor = await Contributor.findById(contributorId);
  if (!contributor) {
    throw new Error('Contributor not found');
  }

  const dateRange = getDateRange(period, customRange);
  const matchStage: any = {
    contributorId: new mongoose.Types.ObjectId(contributorId),
    synced: true,
  };

  if (dateRange.startDate && dateRange.endDate) {
    matchStage.createdAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate,
    };
  }

  const transactions = await LedgerEvent.find(matchStage)
    .populate('agentId', 'fullName')
    .sort({ createdAt: -1 })
    .lean();

  let totalDeposited = 0;
  let totalWithdrawn = 0;
  let totalReconciled = 0;

  const processedTransactions: TransactionLog[] = await Promise.all(
    transactions.map(async (tx: any) => {
      const isReconciled = await isTransactionReconciled(tx, tx.agentId);
      
      if (tx.eventType === 'DEPOSIT') {
        totalDeposited += tx.amount;
        if (isReconciled) totalReconciled += tx.amount;
      } else if (tx.eventType === 'WITHDRAWAL') {
        totalWithdrawn += tx.amount;
      }

      const paymentStatus = isReconciled
        ? 'Reconciled'
        : tx.synced
        ? 'Successful'
        : 'Pending';

      const typeMap: Record<string, 'Deposit' | 'Withdrawal' | 'Adjustment' | 'Reconciliation'> = {
        DEPOSIT: 'Deposit',
        WITHDRAWAL: 'Withdrawal',
        REVERSAL: 'Adjustment',
        RECONCILIATION: 'Reconciliation',
      };

      return {
        id: tx._id.toString(),
        transactionId: tx.referenceId,
        contributorId: tx.contributorId?.toString(),
        contributorName: contributor.fullName,
        agentId: tx.agentId?._id?.toString(),
        agentName: tx.agentId?.fullName,
        amount: tx.amount,
        paymentStatus,
        transactionType: typeMap[tx.eventType] || 'Deposit',
        dateTime: tx.createdAt.toISOString(),
        reference: tx.referenceId,
        description: tx.metadata?.description || '',
      };
    })
  );

  const currentBalance = await getContributorBalance(contributorId);

  return {
    contributorId,
    contributorName: contributor.fullName,
    totalDeposited,
    totalReconciled,
    totalWithdrawn,
    currentBalance,
    transactions: processedTransactions,
  };
}

/**
 * Get all agents with monitoring info
 */
export async function getAgentsList(): Promise<AgentInfo[]> {
  const agents = await User.find({ role: 'agent' })
    .sort({ createdAt: -1 })
    .lean();

  const agentsWithStats = await Promise.all(
    agents.map(async (agent: any) => {
      // Get assigned contributors count
      const contributorCount = await Contributor.countDocuments({
        onboardedByAgentId: agent._id,
      });

      // Get transaction stats
      const transactionStats = await LedgerEvent.aggregate([
        {
          $match: {
            agentId: agent._id,
            synced: true,
            eventType: { $in: ['DEPOSIT', 'WITHDRAWAL'] },
          },
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalFunds: { $sum: '$amount' },
          },
        },
      ]);

      // Get last activity from audit logs
      const lastActivity = await AuditLog.findOne({
        actorId: agent._id,
      })
        .sort({ createdAt: -1 })
        .lean();

      // Get unreconciled balance
      const unreconciledBalance = await getAgentUnreconciledBalance(agent._id.toString());

      const status: 'Active' | 'Inactive' | 'Suspended' = agent.isActive
        ? 'Active'
        : 'Suspended';

      return {
        id: agent._id.toString(),
        name: agent.fullName,
        email: agent.email,
        status,
        assignedContributors: contributorCount,
        totalTransactionsHandled: transactionStats[0]?.totalTransactions || 0,
        totalFundsProcessed: transactionStats[0]?.totalFunds || 0,
        lastActivityTimestamp: lastActivity?.createdAt?.toISOString(),
        unreconciledBalance,
      };
    })
  );

  return agentsWithStats;
}

/**
 * Get agent activity tracking
 */
export async function getAgentActivity(
  agentId: string,
  limit: number = 100
): Promise<AgentActivity[]> {
  const activities = await AuditLog.find({
    actorId: new mongoose.Types.ObjectId(agentId),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actorId', 'fullName')
    .lean();

  return activities.map((activity: any) => ({
    agentId: activity.actorId?._id?.toString() || '',
    agentName: activity.actorId?.fullName || '',
    actionType: activity.actionType,
    resourceType: activity.resourceType,
    timestamp: activity.createdAt.toISOString(),
    details: activity.metadata,
  }));
}

/**
 * Get analytics data
 */
export async function getAnalyticsData(
  period: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily',
  customRange?: DateRange
): Promise<AnalyticsData> {
  const dateRange = getDateRange(period, customRange);
  const matchStage: any = {
    synced: true,
  };

  if (dateRange.startDate && dateRange.endDate) {
    matchStage.createdAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate,
    };
  }

  // Revenue trend (daily deposits)
  const revenueTrend = await LedgerEvent.aggregate([
    {
      $match: {
        ...matchStage,
        eventType: 'DEPOSIT',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        amount: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Reconciliation trend
  const reconciliationTrend = await AgentReconciliation.aggregate([
    {
      $match: {
        status: 'APPROVED',
        reconciledAt: dateRange.startDate && dateRange.endDate
          ? { $gte: dateRange.startDate, $lte: dateRange.endDate }
          : {},
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$reconciledAt' },
        },
        amount: { $sum: '$reconciledAmount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Deposit vs Withdrawal
  const depositVsWithdrawal = await LedgerEvent.aggregate([
    {
      $match: {
        ...matchStage,
        eventType: { $in: ['DEPOSIT', 'WITHDRAWAL'] },
      },
    },
    {
      $group: {
        _id: '$eventType',
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Contributor performance
  const contributorPerformance = await LedgerEvent.aggregate([
    {
      $match: {
        ...matchStage,
        eventType: 'DEPOSIT',
      },
    },
    {
      $group: {
        _id: '$contributorId',
        totalDeposited: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { totalDeposited: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'contributors',
        localField: '_id',
        foreignField: '_id',
        as: 'contributor',
      },
    },
    { $unwind: '$contributor' },
  ]);

  return {
    revenueTrend: revenueTrend.map((item) => ({
      date: item._id,
      amount: item.amount,
    })),
    reconciliationTrend: reconciliationTrend.map((item) => ({
      date: item._id,
      amount: item.amount,
    })),
    depositVsWithdrawal: {
      deposits:
        depositVsWithdrawal.find((item) => item._id === 'DEPOSIT')?.total || 0,
      withdrawals:
        depositVsWithdrawal.find((item) => item._id === 'WITHDRAWAL')?.total || 0,
    },
    contributorPerformance: contributorPerformance.map((item) => ({
      contributorId: item._id.toString(),
      contributorName: item.contributor.fullName,
      totalDeposited: item.totalDeposited,
      transactionCount: item.transactionCount,
    })),
  };
}

export const dashboardService = {
  getFinancialSummary,
  getTransactionLogs,
  getContributorTransactionView,
  getAgentsList,
  getAgentActivity,
  getAnalyticsData,
};
