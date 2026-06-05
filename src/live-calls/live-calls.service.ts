import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LiveCallsGateway } from './live-calls.gateway';

export interface LiveCall {
  id: string;
  tableId: string;
  tableNumber: number;
  type: 'WAITER' | 'BILL';
  createdAt: Date;
}

@Injectable()
export class LiveCallsService {
  private activeCalls: Map<number, LiveCall[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: LiveCallsGateway,
  ) {}

  private async checkAccess(restaurantId: number, userId: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: userId },
    });
    if (!restaurant) throw new ForbiddenException('Access denied');
  }

  async getActiveCalls(
    restaurantId: number,
    userId: number,
  ): Promise<LiveCall[]> {
    await this.checkAccess(restaurantId, userId);
    return this.activeCalls.get(restaurantId) || [];
  }

  async triggerCallFromTable(
    restaurantId: number,
    tableId: string,
    type: 'WAITER' | 'BILL',
  ) {
    const table = await this.prisma.diningTable.findFirst({
      where: { id: tableId, restaurantId },
    });
    if (!table) throw new NotFoundException('Table not found');

    const newCall: LiveCall = {
      id: Math.random().toString(36).substring(2, 11),
      tableId,
      tableNumber: table.number,
      type,
      createdAt: new Date(),
    };

    const currentCalls = this.activeCalls.get(restaurantId) || [];
    currentCalls.push(newCall);
    this.activeCalls.set(restaurantId, currentCalls);

    this.gateway.broadcastNewCall(restaurantId, newCall);
    return { success: true };
  }

  async dismissCall(restaurantId: number, callId: string, userId: number) {
    await this.checkAccess(restaurantId, userId);

    const currentCalls = this.activeCalls.get(restaurantId) || [];
    const filteredCalls = currentCalls.filter((c) => c.id !== callId);
    this.activeCalls.set(restaurantId, filteredCalls);

    this.gateway.broadcastCallDismissed(restaurantId, callId);
    return { success: true };
  }
}

import { NotFoundException } from '@nestjs/common';
