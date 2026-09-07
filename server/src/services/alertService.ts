import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { AlertType } from '@prisma/client';

class AlertService {
  private intervalId: NodeJS.Timeout | null = null;
  private checkInterval: number = 5 * 60 * 1000; // 5 minutes

  start() {
    logger.info('Alert service started - checking stock levels every 5 minutes');
    this.intervalId = setInterval(() => this.checkStockLevels(), this.checkInterval);
    // Run initial check after 30 seconds
    setTimeout(() => this.checkStockLevels(), 30000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Alert service stopped');
    }
  }

  private async checkStockLevels() {
    try {
      const products = await prisma.product.findMany({
        where: { status: { in: ['active'] } },
      });

      for (const product of products) {
        const alertType = this.determineAlertType(product.stockQuantity, product.reorderLevel);
        if (!alertType) continue;

        // Check if there's already an unacknowledged alert for this product
        const existingAlert = await prisma.alertLog.findFirst({
          where: {
            productId: product.id,
            alertType,
            isAcknowledged: false,
          },
        });

        if (existingAlert) continue; // Don't create duplicate alerts

        const message = this.formatAlertMessage(product.name, product.stockQuantity, product.reorderLevel, product.unit, alertType);

        await prisma.alertLog.create({
          data: {
            productId: product.id,
            alertType,
            message,
          },
        });

        logger.warn(`Stock alert: ${message}`);
        await this.notifyRecipients(product, alertType);
      }
    } catch (error) {
      logger.error('Error checking stock levels:', error);
    }
  }

  private determineAlertType(stockQuantity: number, reorderLevel: number): AlertType | null {
    if (stockQuantity === 0) return 'out_of_stock';
    const ratio = stockQuantity / reorderLevel;
    if (ratio < 0.3) return 'critical';
    if (ratio <= 1) return 'warning';
    return null;
  }

  private formatAlertMessage(name: string, stock: number, reorderLevel: number, unit: string, alertType: AlertType): string {
    const emojis: Record<string, string> = { warning: '⚠️', critical: '🔴', out_of_stock: '🚨' };
    const labels: Record<string, string> = {
      warning: 'WARNING',
      critical: 'CRITICAL',
      out_of_stock: 'OUT OF STOCK',
    };
    return `${emojis[alertType]} ${labels[alertType]}: ${name} - Stock: ${stock} ${unit} (Reorder level: ${reorderLevel} ${unit})`;
  }

  private async notifyRecipients(product: any, _alertType: AlertType) {
    try {
      const recipients = await prisma.alertRecipient.findMany({
        where: { isActive: true },
        include: { user: true },
      });

      for (const recipient of recipients) {
        // In production, integrate with Africa's Talking (SMS) and Nodemailer (Email)
        logger.info(`Alert notification sent to ${recipient.contactValue} via ${recipient.recipientType}`);
      }
    } catch (error) {
      logger.error('Error notifying recipients:', error);
    }
  }
}

export const alertService = new AlertService();
