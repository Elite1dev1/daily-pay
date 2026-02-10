import axios from 'axios';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

/**
 * SMS Service
 * Handles sending SMS messages for OTP and transaction confirmations
 * 
 * Currently supports Twilio, but can be extended to support other providers
 */
class SMSService {
  private apiKey: string;
  private apiSecret: string;
  private fromNumber: string;
  private provider: string;

  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'twilio';
    this.apiKey = process.env.SMS_API_KEY || '';
    this.apiSecret = process.env.SMS_API_SECRET || '';
    this.fromNumber = process.env.SMS_FROM_NUMBER || '';
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(to: string, message: string): Promise<void> {
    if (!this.apiKey || !this.apiSecret || !this.fromNumber) {
      logger.warn('SMS credentials not configured, skipping SMS send');
      return;
    }

    try {
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${this.apiKey}/Messages.json`,
        new URLSearchParams({
          From: this.fromNumber,
          To: to,
          Body: message,
        }),
        {
          auth: {
            username: this.apiKey,
            password: this.apiSecret,
          },
        }
      );

      logger.info('SMS sent successfully', {
        to,
        messageId: response.data.sid,
      });
    } catch (error: any) {
      logger.error('Failed to send SMS via Twilio', {
        error: error.message,
        to,
      });
      throw new Error(`SMS delivery failed: ${error.message}`);
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<void> {
    // Format phone number (add country code if needed)
    const formattedTo = this.formatPhoneNumber(to);

    try {
      switch (this.provider.toLowerCase()) {
        case 'twilio':
          await this.sendViaTwilio(formattedTo, message);
          break;
        default:
          logger.warn('Unknown SMS provider, using mock', { provider: this.provider });
          // In development, just log the message
          logger.info('SMS (mock)', { to: formattedTo, message });
      }
    } catch (error: any) {
      logger.error('SMS service error', { error: error.message, to: formattedTo });
      throw error;
    }
  }

  /**
   * Format phone number (add +234 for Nigeria if not present)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 234 (Nigeria country code)
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    }

    // If doesn't start with country code, add 234
    if (!cleaned.startsWith('234')) {
      cleaned = '234' + cleaned;
    }

    return '+' + cleaned;
  }

  /**
   * Send OTP SMS
   */
  async sendOTP(phoneNumber: string, otpCode: string, purpose: string = 'WITHDRAWAL'): Promise<void> {
    const message = `Your DaiLi Pay ${purpose} OTP is: ${otpCode}. Valid for 10 minutes. Do not share this code.`;
    await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send deposit confirmation SMS
   */
  async sendDepositConfirmation(
    phoneNumber: string,
    amount: number,
    balance: number,
    referenceId: string
  ): Promise<void> {
    const message = `DaiLi Pay: Deposit of ₦${amount.toLocaleString()} received. New balance: ₦${balance.toLocaleString()}. Ref: ${referenceId}`;
    await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send withdrawal confirmation SMS
   */
  async sendWithdrawalConfirmation(
    phoneNumber: string,
    amount: number,
    balance: number,
    referenceId: string
  ): Promise<void> {
    const message = `DaiLi Pay: Withdrawal of ₦${amount.toLocaleString()} processed. New balance: ₦${balance.toLocaleString()}. Ref: ${referenceId}`;
    await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send balance inquiry SMS
   */
  async sendBalanceInquiry(phoneNumber: string, balance: number): Promise<void> {
    const message = `DaiLi Pay: Your current balance is ₦${balance.toLocaleString()}`;
    await this.sendSMS(phoneNumber, message);
  }
}

export const smsService = new SMSService();
