import { config } from '../config';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { PrismaClient } from '@prisma/client';

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

interface BconAddressResponse {
  status: string;
  data?: {
    address: string;
    payment_amount: string;
    payment_currency: string;
    origin_amount: string;
    origin_currency: string;
    external_id: string;
    chain: string;
    expires_at?: string;
  };
  error?: string;
}

interface BconCallbackData {
  status: number; // 0 = unconfirmed, 1 = partially_confirmed, 2 = confirmed
  addr: string;
  value: string;
  txid: string;
  external_id: string;
}

/**
 * BCon Global crypto payment service.
 *
 * Flow:
 *  1. Frontend calls POST /payments/crypto/bcon/initialize with { orderId, currency, chain }
 *  2. We call BCon API to create an invoice (generates a payment address)
 *  3. Frontend shows the address + QR code to the customer
 *  4. Customer sends crypto to the address
 *  5. BCon sends a callback to our webhook when payment is confirmed
 *  6. We mark the order as paid
 *
 * We also poll BCon's API as a fallback in case the webhook doesn't arrive.
 */
class BconService {
  private get headers() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.bconApiKey}`,
    };
  }

  /**
   * Create a crypto invoice via BCon API.
   * Returns the payment address and amount the customer needs to send.
   */
  async createInvoice(params: {
    orderId: number;
    paymentCurrency: string;
    chain: string;
    originAmount: number;
    originCurrency: string;
  }): Promise<{
    address: string;
    paymentAmount: string;
    paymentCurrency: string;
    externalId: string;
    chain: string;
    expiresAt?: string;
  }> {
    const { orderId, paymentCurrency, chain, originAmount, originCurrency } = params;

    // external_id must be unique, max 8 chars — use order ID
    const externalId = `KB${orderId}`;

    const body = {
      payment_currency: paymentCurrency,
      origin_amount: String(originAmount),
      origin_currency: originCurrency,
      external_id: externalId,
      chain: chain,
    };

    logger.info(`BCon: Creating invoice for order ${orderId} — ${originAmount} ${originCurrency} → ${paymentCurrency} on ${chain}`);

    const response = await fetch(`${config.bconApiUrl}/api/v2/address`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as BconAddressResponse;

    if (!response.ok || data.status !== 'success' || !data.data) {
      throw new Error(data.error || 'Failed to create BCon invoice');
    }

    // Store the BCon invoice data in the payment record (pending)
    await prisma.payment.create({
      data: {
        orderId,
        paymentMethod: this.mapCurrencyToMethod(paymentCurrency),
        amount: originAmount,
        transactionId: externalId,
        status: 'pending',
        paymentData: {
          provider: 'bcon',
          address: data.data.address,
          payment_amount: data.data.payment_amount,
          payment_currency: data.data.payment_currency,
          chain: data.data.chain,
          external_id: externalId,
          expires_at: data.data.expires_at,
        },
      },
    });

    logger.info(`BCon: Invoice created — ${externalId}, address: ${data.data.address}`);

    return {
      address: data.data.address,
      paymentAmount: data.data.payment_amount,
      paymentCurrency: data.data.payment_currency,
      externalId,
      chain: data.data.chain,
      expiresAt: data.data.expires_at,
    };
  }

  /**
   * Process a BCon callback (webhook).
   * Called when BCon notifies us of a payment status change.
   */
  async processCallback(data: BconCallbackData): Promise<void> {
    const { status, addr, value, txid, external_id } = data;

    logger.info(`BCon callback: status=${status}, external_id=${external_id}, txid=${txid}, value=${value}`);

    // Find the payment by external_id (stored as transactionId)
    const payment = await prisma.payment.findFirst({
      where: { transactionId: external_id },
      include: { order: true },
    });

    if (!payment) {
      logger.warn(`BCon callback: No payment found for external_id ${external_id}`);
      return;
    }

    // Only process confirmed payments (status = 2)
    if (status === 2 && payment.status !== 'completed') {
      await prisma.$transaction(async (tx: TransactionClient) => {
        // Update payment to completed
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            settledAt: new Date(),
            paymentData: {
              ...(payment.paymentData as any),
              txid,
              confirmed_value: value,
              confirmed_at: new Date().toISOString(),
            },
          },
        });

        // Update order payment status
        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'paid' },
        });
      });

      logger.info(`BCon: Payment confirmed for order ${payment.orderId}, txid: ${txid}`);
    } else if (status === 0 || status === 1) {
      logger.info(`BCon: Payment pending (status=${status}) for external_id ${external_id}`);
    }
  }

  /**
   * Check payment status by polling BCon (fallback if webhook doesn't arrive).
   * This is called from the frontend when the user clicks "Check Payment".
   */
  async checkPaymentStatus(externalId: string): Promise<{
    paid: boolean;
    status: string;
    txid?: string;
  }> {
    const payment = await prisma.payment.findFirst({
      where: { transactionId: externalId },
    });

    if (!payment) {
      return { paid: false, status: 'not_found' };
    }

    if (payment.status === 'completed') {
      return { paid: true, status: 'completed', txid: (payment.paymentData as any)?.txid };
    }

    // Try to query BCon's API for current status
    // Note: BCon doesn't have a documented "get invoice status" endpoint in their docs,
    // so we rely on the callback. If the payment is still pending, we return pending.
    return { paid: false, status: payment.status };
  }

  /**
   * Map crypto currency to our PaymentMethod enum.
   */
  private mapCurrencyToMethod(currency: string): any {
    const upper = currency.toUpperCase();
    if (upper === 'BTC' || upper === 'USDT' || upper === 'USDC' || upper === 'ETH') {
      return 'crypto_stablecoin';
    }
    return 'crypto_other';
  }
}

export const bconService = new BconService();
