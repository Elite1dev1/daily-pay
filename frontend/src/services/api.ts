import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add device ID if available
        const deviceId = localStorage.getItem('deviceId');
        if (deviceId) {
          config.headers['x-device-id'] = deviceId;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - logout user
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    role: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Contributor endpoints
  async onboardContributor(data: {
    fullName: string;
    phoneNumber: string;
    address: string;
    idPhotographUrl?: string;
    qrHash: string;
  }) {
    const response = await this.client.post('/contributors/onboard', data);
    return response.data;
  }

  async getContributorById(id: string) {
    const response = await this.client.get(`/contributors/${id}`);
    return response.data;
  }

  async getContributorByQR(qrHash: string) {
    const response = await this.client.get(`/contributors/qr/${qrHash}`);
    return response.data;
  }

  async listContributors(params?: { limit?: number; offset?: number }) {
    const response = await this.client.get('/contributors', { params });
    return response.data;
  }

  // Deposit endpoints
  async createDeposit(data: {
    contributorId: string;
    qrHash: string;
    amount: number;
    gpsLatitude: number;
    gpsLongitude: number;
    gpsAccuracy?: number;
  }) {
    const response = await this.client.post('/deposits', data);
    return response.data;
  }

  async syncDeposit(id: string) {
    const response = await this.client.post(`/deposits/sync/${id}`);
    return response.data;
  }

  async getDeposits(params?: { limit?: number; offset?: number }) {
    const response = await this.client.get('/deposits', { params });
    return response.data;
  }

  async getDepositStatus() {
    const response = await this.client.get('/deposits/status');
    return response.data;
  }

  // Withdrawal endpoints
  async createWithdrawal(data: { contributorId: string; amount: number }) {
    const response = await this.client.post('/withdrawals', data);
    return response.data;
  }

  async verifyWithdrawalOTP(id: string, otpCode: string) {
    const response = await this.client.post(`/withdrawals/${id}/verify-otp`, { otpCode });
    return response.data;
  }

  async approveWithdrawal(id: string) {
    const response = await this.client.post(`/withdrawals/${id}/approve`);
    return response.data;
  }

  async rejectWithdrawal(id: string, reason: string) {
    const response = await this.client.post(`/withdrawals/${id}/reject`, { reason });
    return response.data;
  }

  async getWithdrawals(params?: { limit?: number; offset?: number; state?: string }) {
    const response = await this.client.get('/withdrawals', { params });
    return response.data;
  }

  async getPendingWithdrawals(params?: { limit?: number; offset?: number }) {
    const response = await this.client.get('/withdrawals/pending', { params });
    return response.data;
  }

  // Reconciliation endpoints
  async createReconciliation(data: { cashAmountPresented: number; notes?: string }) {
    const response = await this.client.post('/reconciliation', data);
    return response.data;
  }

  async approveReconciliation(id: string) {
    const response = await this.client.post(`/reconciliation/${id}/approve`);
    return response.data;
  }

  async rejectReconciliation(id: string, reason: string) {
    const response = await this.client.post(`/reconciliation/${id}/reject`, { reason });
    return response.data;
  }

  async getReconciliations(params?: { limit?: number; offset?: number; status?: string }) {
    const response = await this.client.get('/reconciliation', { params });
    return response.data;
  }

  async getPendingReconciliations(params?: { limit?: number; offset?: number }) {
    const response = await this.client.get('/reconciliation/pending', { params });
    return response.data;
  }

  // Dashboard endpoints
  async getFinancialSummary(params?: { period?: string; startDate?: string; endDate?: string }) {
    const response = await this.client.get('/dashboard/financial-summary', { params });
    return response.data;
  }

  async getTransactionLogs(params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    type?: string;
    contributorId?: string;
    agentId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.client.get('/dashboard/transactions', { params });
    return response.data;
  }

  async getContributorTransactions(
    contributorId: string,
    params?: { period?: string; startDate?: string; endDate?: string }
  ) {
    const response = await this.client.get(`/dashboard/contributors/${contributorId}/transactions`, { params });
    return response.data;
  }

  async getAgentsList() {
    const response = await this.client.get('/dashboard/agents');
    return response.data;
  }

  async getAgentActivity(agentId: string, params?: { limit?: number }) {
    const response = await this.client.get(`/dashboard/agents/${agentId}/activity`, { params });
    return response.data;
  }

  async getAnalytics(params?: { period?: string; startDate?: string; endDate?: string }) {
    const response = await this.client.get('/dashboard/analytics', { params });
    return response.data;
  }
}

export const apiService = new ApiService();
