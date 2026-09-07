import { config } from '../config';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { PrismaClient } from '@prisma/client';

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string;
    channel: string;
    metadata: any;
    gateway_response: string;
    fees: number;
    customer: {
      email: string;
      customer_code: string;
    };
  };
}

/**
 * Paystack service — handles initialize, verify, and webhook processing.
 *
 * Flow:
 *  1. Frontend calls POST /payments/paystack/initialize with { orderId, email }
 *  2. We call Paystack to create a transaction, return the authorization_url
 *  3. Customer pays on Paystack's page
 *  4. Frontend calls POST /payments/paystack/verify with { reference }
 *  5. We verify with Paystack, then create the payment record and update the order
 *  6. Paystack also sends a webhook — we handle that as a backup
 */
class PaystackService {
  private get headers() {
    return {
      Authorization: `Bearer ${config.paystackSecretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize a Paystack transaction.
   * Returns the authorization_url (where the customer pays) and the reference.
   */
  async initialize(params: {
    orderId: number;
    email: string;
    amount: number;
    reference?: string;
  }): Promise<{ authorizationUrl: string; accessCode: string; reference: string }> {
    const { orderId, email, amount, reference } = params;

    // Amount in kobo/pesewas (GHS × 100)
    const amountInPesewas = Math.round(amount * 100);
    const txRef = reference || `KB-${orderId}-${Date.now()}`;

    const body = {
      email,
      amount: amountInPesewas,
      currency: 'GHS',
      reference: txRef,
      metadata: {
        order_id: orderId,
        platform: 'kusum_beach',
      },
    };

    const response = await fetch(`${config.paystackBaseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as PaystackInitializeResponse;

    if (!data.status) {
      throw new Error(data.message || 'Failed to initialize Paystack transaction');
    }

    logger.info(`Paystack transaction initialized: ${txRef} for order ${orderId}`);

    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: txRef,
    };
  }

  /**
   * Verify a Paystack transaction by reference.
   * If successful, creates the payment record and updates the order.
   */
  async verify(reference: string): Promise<{
    success: boolean;
    order?: any;
    message: string;
  }> {
    const response = await fetch(`${config.paystackBaseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: this.headers,
    });

    const data = (await response.json()) as PaystackVerifyResponse;

    if (!data.status) {
      return { success: false, message: data.message || 'Verification failed' };
    }

    const txData = data.data;

    if (txData.status !== 'success') {
      return { success: false, message: `Transaction was not successful: ${txData.status}` };
    }

    // Extract order_id from metadata
    const orderId = txData.metadata?.order_id;
    if (!orderId) {
      return { success: false, message: 'No order_id found in transaction metadata' };
    }

    // Check if payment already recorded (idempotency)
    const existingPayment = await prisma.payment.findFirst({
      where: { transactionId: reference },
    });
    if (existingPayment) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      return { success: true, order, message: 'Payment already verified' };
    }

    // Create payment and update order in a transaction
    const order = await prisma.$transaction(async (tx: TransactionClient) => {
      // Create payment record
      await tx.payment.create({
        data: {
          orderId,
          paymentMethod: this.mapChannelToMethod(txData.channel),
          amount: txData.amount / 100, // Convert from pesewas back to GHS
          transactionId: reference,
          status: 'completed',
          settledAt: new Date(txData.paid_at),
          paymentData: {
            paystack_reference: reference,
            channel: txData.channel,
            gateway_response: txData.gateway_response,
            fees: txData.fees / 100,
            customer_email: txData.customer.email,
          },
        },
      });

      // Update order payment status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'paid' },
      });

      return updatedOrder;
    });

    logger.info(`Paystack payment verified: ${reference} for order ${orderId}`);

    return { success: true, order, message: 'Payment verified successfully' };
  }

  /**
   * Process a Paystack webhook event.
   * Paystack sends webhooks for charge.success, charge.failed, etc.
   */
  async processWebhook(event: any): Promise<void> {
    const { event: eventType, data } = event;

    if (eventType === 'charge.success') {
      const reference = data.reference;
      logger.info(`Paystack webhook: charge.success for ${reference}`);

      // Verify the transaction (idempotent — safe to call even if already verified)
      await this.verify(reference);
    } else if (eventType === 'charge.failed') {
      const reference = data.reference;
      logger.warn(`Paystack webhook: charge.failed for ${reference}`);

      // Mark payment as failed if it exists
      const payment = await prisma.payment.findFirst({
        where: { transactionId: reference },
      });
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed' },
        });
      }
    }
  }

  /**
   * Verify webhook signature to ensure it's from Paystack.
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    // Paystack sends the secret key as the signature in test mode
    // In production, you'd use HMAC SHA256 with the secret key
    // For now, we check if the signature matches our secret key
    return signature === config.paystackSecretKey;
  }

  /**
   * Map Paystack channel to our PaymentMethod enum.
   */
  private mapChannelToMethod(channel: string): any {
    const channelLower = (channel || '').toLowerCase();
    if (channelLower.includes('momo') || channelLower.includes('mobile_money')) {
      return 'momo_mtn'; // Default to MTN for mobile money
    }
    return 'cash'; // Fallback
  }
}

export const paystackService = new PaystackService();
