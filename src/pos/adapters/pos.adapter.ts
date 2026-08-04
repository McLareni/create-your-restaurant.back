import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

export interface PosMenuDish {
  name: string;
  price: number;
  description: string;
  weight?: number | null;
  cookingTime?: number | null;
  calories?: number | null;
}

export interface PosMenuCategory {
  category_name: string;
  dishes: PosMenuDish[];
}

export interface PosAdapter {
  fetchMenu(apiKey: string): Promise<PosMenuCategory[]>;
}

@Injectable()
export class PosterAdapter implements PosAdapter {
  async fetchMenu(apiKey: string): Promise<PosMenuCategory[]> {
    if (!apiKey) {
      throw new BadRequestException('errors.pos_invalid_api_key');
    }

    try {
      const response = await fetch(
        `https://joinposter.com/api/menu.getProducts?token=${apiKey}`,
      );

      if (!response.ok) {
        throw new InternalServerErrorException('errors.pos_fetch_failed');
      }

      const data = (await response.json()) as { response?: PosMenuCategory[] };
      return data.response ?? [];
    } catch {
      throw new InternalServerErrorException('errors.pos_connection_error');
    }
  }
}

@Injectable()
export class PosAdapterFactory {
  constructor(private readonly posterAdapter: PosterAdapter) {}

  getAdapter(provider: string): PosAdapter {
    if (provider.toUpperCase() === 'POSTER') {
      return this.posterAdapter;
    }
    throw new BadRequestException('errors.unsupported_pos_provider');
  }
}
