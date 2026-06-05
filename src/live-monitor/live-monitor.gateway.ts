import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { LiveMonitorService } from './live-monitor.service';

type SubscriptionPayload = {
  restaurantId: number | string;
};

@WebSocketGateway({
  namespace: '/live-monitor',
  cors: {
    origin: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],
    credentials: true,
  },
})
export class LiveMonitorGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(LiveMonitorGateway.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly liveMonitorService: LiveMonitorService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractCookieValue(
        client.handshake.headers.cookie,
        'gustio_session',
      );

      if (!token) {
        throw new Error('Session token is required');
      }

      const user = await this.usersService.validateSessionToken(token);
      client.data.userId = user.id;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('live-monitor:subscribe')
  async subscribeToRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscriptionPayload,
  ) {
    const restaurantId = Number(payload?.restaurantId);
    const userId = Number(client.data.userId);

    if (!restaurantId || Number.isNaN(restaurantId) || Number.isNaN(userId)) {
      return { ok: false, message: 'Invalid payload' };
    }

    await this.liveMonitorService.ensureRestaurantAccess(restaurantId, userId);
    await client.join(this.getRestaurantRoom(restaurantId));

    return { ok: true, restaurantId };
  }

  @SubscribeMessage('live-monitor:unsubscribe')
  async unsubscribeFromRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscriptionPayload,
  ) {
    const restaurantId = Number(payload?.restaurantId);

    if (!restaurantId || Number.isNaN(restaurantId)) {
      return { ok: false, message: 'Invalid payload' };
    }

    await client.leave(this.getRestaurantRoom(restaurantId));
    return { ok: true, restaurantId };
  }

  emitOrdersChanged(
    restaurantId: number,
    changeType: 'created' | 'updated' | 'deleted',
    orderId: string,
  ) {
    const room = this.getRestaurantRoom(restaurantId);
    this.server.to(room).emit('live-monitor:orders-changed', {
      restaurantId,
      changeType,
      orderId,
      emittedAt: new Date().toISOString(),
    });
  }

  private getRestaurantRoom(restaurantId: number) {
    return `restaurant:${restaurantId}`;
  }

  private extractCookieValue(cookieHeader: string | undefined, key: string) {
    if (!cookieHeader) {
      return null;
    }

    const keyValue = cookieHeader
      .split(';')
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith(`${key}=`));

    if (!keyValue) {
      return null;
    }

    const rawValue = keyValue.slice(key.length + 1);
    try {
      return decodeURIComponent(rawValue);
    } catch {
      this.logger.warn('Failed to decode session cookie value');
      return rawValue;
    }
  }
}
