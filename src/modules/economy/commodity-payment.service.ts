import { randomUUID } from 'crypto';

import { CommodityOrderStatus, PaymentStatus } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { NotFoundException, ValidationException } from '../../lib/exceptions';
import { FileRepository } from '../file/file.repository';
import { CommodityOrderRepository } from './commodity-order.repository';
import { CommodityPaymentRepository } from './commodity-payment.repository';
import type { CreateCommodityPaymentInput } from './economy.schema';
import type { CommodityPaymentResponse, EconomyServiceMeta } from './economy.types';

export class CommodityPaymentService {
  private readonly paymentRepository: CommodityPaymentRepository;
  private readonly orderRepository: CommodityOrderRepository;
  private readonly fileRepository: FileRepository;

  constructor(db: DatabaseClient) {
    this.paymentRepository = new CommodityPaymentRepository(db);
    this.orderRepository = new CommodityOrderRepository(db);
    this.fileRepository = new FileRepository(db);
  }

  async submitPayment(input: CreateCommodityPaymentInput, _meta: EconomyServiceMeta): Promise<CommodityPaymentResponse> {
    const order = await this.orderRepository.findById(input.commodityOrderId);
    if (!order) throw new NotFoundException('Commodity order not found');

    if (order.status !== CommodityOrderStatus.PENDING_PAYMENT) {
      throw new ValidationException('Validation failed', [
        { field: 'commodityOrderId', message: 'Order is not awaiting payment' },
      ]);
    }

    const file = await this.fileRepository.findById(input.fileId);
    if (!file) throw new NotFoundException('File not found');

    const payment = await this.paymentRepository.create({
      id: randomUUID(),
      commodityOrderId: order.id,
      fileId: input.fileId,
      senderName: input.senderName,
      paymentStatus: PaymentStatus.PENDING,
    });

    await this.orderRepository.updateStatus(order.id, CommodityOrderStatus.WAITING_VERIFICATION);

    return {
      id: payment.id,
      commodityOrderId: payment.commodityOrderId,
      senderName: payment.senderName,
      paymentStatus: payment.paymentStatus,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}
