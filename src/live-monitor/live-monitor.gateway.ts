import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import { LiveMonitorService } from 'src/live-monitor/live-monitor.service';
import { getAllowedCorsOrigins } from 'src/common/cors';

interface SubscriptionPayload {
  restaurantId: number | string;
}

@WebSocketGateway({
  namespace: '/live-monitor',
  cors: {
    origin: getAllowedCorsOrigins(),
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
      let token = client.handshake.auth?.token;
      if (!token) {
        token = this.extractCookieValue(
          client.handshake.headers.cookie,
          'gustio_session',
        );
      }

      if (!token) {
        throw new Error('errors.session_token_required');
      }

      const user = await this.usersService.validateSessionToken(token);
      client.data.userId = user.id;

      const restaurantId = Number(client.handshake.auth?.restaurantId);
      if (!restaurantId || Number.isNaN(restaurantId)) {
        return;
      }

      await this.liveMonitorService.ensureRestaurantAccess(
        restaurantId,
        user.id,
      );
      await client.join(this.getRestaurantRoom(restaurantId));
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
      return { ok: false, message: 'errors.invalid_payload' };
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
      return { ok: false, message: 'errors.invalid_payload' };
    }
    await client.leave(this.getRestaurantRoom(restaurantId));
    return { ok: true, restaurantId };
  }

  async emitOrdersChanged(
    restaurantId: number,
    changeType: 'created' | 'updated' | 'deleted',
    orderId: string,
    tableId: string,
  ) {
    const tableSnapshot = await this.liveMonitorService.getSingleTableSnapshot(
      restaurantId,
      tableId,
    );
    const room = this.getRestaurantRoom(restaurantId);

    this.server.to(room).emit('live-monitor:orders-changed', {
      restaurantId,
      changeType,
      orderId,
      tableId,
      tableSnapshot,
      emittedAt: new Date().toISOString(),
    });
  }

  private getRestaurantRoom(restaurantId: number) {
    return `restaurant:${restaurantId}`;
  }

  private extractAuthToken(client: Socket) {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    return this.extractCookieValue(
      client.handshake.headers.cookie,
      'gustio_session',
    );
  }

  private extractCookieValue(cookieHeader: string | undefined, key: string) {
    if (!cookieHeader) return null;
    const keyValue = cookieHeader
      .split(';')
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith(`${key}=`));
    if (!keyValue) return null;
    const rawValue = keyValue.slice(key.length + 1);
    try {
      return decodeURIComponent(rawValue);
    } catch {
      this.logger.warn('errors.failed_decode_session_cookie');
      return rawValue;
    }
  }
}
