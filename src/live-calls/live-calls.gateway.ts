import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class LiveCallsGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join_restaurant')
  handleJoinRestaurant(
    @MessageBody() data: { restaurantId: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`restaurant_${data.restaurantId}`);
    return { status: 'joined' };
  }

  broadcastNewCall(restaurantId: number, call: any) {
    this.server.to(`restaurant_${restaurantId}`).emit('new_call', call);
  }

  broadcastCallDismissed(restaurantId: number, callId: string) {
    this.server.to(`restaurant_${restaurantId}`).emit('call_dismissed', callId);
  }
}
