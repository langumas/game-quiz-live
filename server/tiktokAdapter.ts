import { EventEmitter } from 'node:events';
import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
} from 'tiktok-live-connector';
import { TikTokConnectionStatus } from '../shared/types.js';

export interface IncomingCommentEvent {
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  comment: string;
  source: 'tiktok' | 'simulation';
}

export interface IncomingLikeEvent {
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  likeCount: number;
  totalLikeCount?: number;
  source: 'tiktok' | 'simulation';
}

export interface IncomingGiftEvent {
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  giftName: string;
  giftId?: number;
  diamondCount: number;
  repeatCount: number;
  source: 'tiktok' | 'simulation';
}

export class TikTokLiveAdapter extends EventEmitter {
  private connection: TikTokLiveConnection | null = null;
  private status: TikTokConnectionStatus = {
    connected: false,
    connecting: false,
    username: '',
    mode: 'simulation',
  };

  public getStatus(): TikTokConnectionStatus {
    return { ...this.status };
  }

  public async connect(rawUsername: string): Promise<TikTokConnectionStatus> {
    const cleanInput = rawUsername.trim().replace(/^@/, '');
    if (!cleanInput) {
      throw new Error('Debes ingresar un nombre de usuario de TikTok válido.');
    }

    await this.disconnect();

    this.status = {
      connected: false,
      connecting: true,
      username: cleanInput,
      mode: 'simulation',
      error: undefined,
    };
    this.emit('status', this.getStatus());

    try {
      const isNumericRoomId = /^\d{15,22}$/.test(cleanInput);
      const targetUser = isNumericRoomId ? 'tiktok' : cleanInput;

      this.connection = new TikTokLiveConnection(targetUser, {
        processInitialData: false,
        fetchRoomInfoOnConnect: false,
        enableExtendedGiftInfo: false,
      });

      this.registerListeners(this.connection);

      const state = await this.connection.connect(
        isNumericRoomId ? cleanInput : undefined
      );

      this.status = {
        connected: true,
        connecting: false,
        username: cleanInput,
        roomId: state.roomId,
        viewerCount:
          (state.roomInfo as any)?.data?.user_count ??
          this.status.viewerCount ??
          0,
        mode: 'tiktok',
        error: undefined,
      };
      this.emit('status', this.getStatus());

      return this.getStatus();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'No se pudo conectar al LIVE de TikTok (verifica que el usuario esté en vivo).';

      this.connection = null;
      this.status = {
        connected: false,
        connecting: false,
        username: cleanInput,
        mode: 'simulation',
        error: errorMsg,
      };
      this.emit('status', this.getStatus());
      throw new Error(errorMsg);
    }
  }

  public async disconnect(): Promise<TikTokConnectionStatus> {
    if (this.connection) {
      try {
        await this.connection.disconnect();
      } catch {
        // Ignore disconnect cleanup errors
      }
      this.connection = null;
    }

    this.status = {
      connected: false,
      connecting: false,
      username: this.status.username,
      mode: 'simulation',
      error: undefined,
    };
    this.emit('status', this.getStatus());
    return this.getStatus();
  }

  private extractUser(data: any): {
    uniqueId: string;
    nickname: string;
    avatarUrl?: string;
  } {
    const user = data?.user || data || {};
    const uniqueId =
      user.displayId ||
      user.uniqueId ||
      user.id ||
      data?.uniqueId ||
      'espectador';
    const nickname =
      user.nickname ||
      user.displayId ||
      user.uniqueId ||
      uniqueId;

    let avatarUrl: string | undefined;
    if (typeof user.profilePictureUrl === 'string') {
      avatarUrl = user.profilePictureUrl;
    } else {
      const urls =
        user.avatarThumb?.mUrls ||
        user.avatarThumb?.url ||
        user.avatarThumb?.urls ||
        user.profilePicture?.url ||
        user.profilePicture?.urls;
      if (Array.isArray(urls) && urls.length > 0) {
        avatarUrl = urls[0];
      }
    }

    return { uniqueId: String(uniqueId), nickname: String(nickname), avatarUrl };
  }

  private registerListeners(conn: TikTokLiveConnection): void {
    conn.on(WebcastEvent.CHAT, (data: any) => {
      const { uniqueId, nickname, avatarUrl } = this.extractUser(data);
      // In protobuf v3 (tiktok-live-connector v2.5.0), chat text is in `data.content` (fallback `data.comment`)
      const rawText = data?.content ?? data?.comment ?? '';
      const comment = String(rawText).trim();
      if (!comment) return;

      const event: IncomingCommentEvent = {
        uniqueId,
        nickname,
        avatarUrl,
        comment,
        source: 'tiktok',
      };
      this.emit('comment', event);
    });

    conn.on(WebcastEvent.LIKE, (data: any) => {
      const { uniqueId, nickname, avatarUrl } = this.extractUser(data);
      // In protobuf v3, like count is `data.count` and total is `data.total`
      const likeCount = Number(data?.count ?? data?.likeCount) || 1;
      const totalLikeCount =
        Number(data?.total ?? data?.totalLikeCount) || undefined;

      const event: IncomingLikeEvent = {
        uniqueId,
        nickname,
        avatarUrl,
        likeCount,
        totalLikeCount,
        source: 'tiktok',
      };
      this.emit('like', event);
    });

    conn.on(WebcastEvent.GIFT, (data: any) => {
      // In protobuf v3, gift metadata is in `data.gift`
      const giftObj = data?.gift || data?.giftDetails || {};
      const giftType = giftObj.type ?? giftObj.giftType ?? data?.giftType;
      const repeatEnd = Boolean(data?.repeatEnd);

      // Wait for streak end on streakable gifts (giftType === 1) to avoid duplicate triggers
      if (giftType === 1 && !repeatEnd) {
        return;
      }

      const { uniqueId, nickname, avatarUrl } = this.extractUser(data);

      const repeatCount = Number(data?.repeatCount ?? data?.comboCount) || 1;
      const unitDiamonds =
        Number(giftObj.diamondCount) ||
        Number(data?.extendedGiftInfo?.diamond_count) ||
        Number(data?.diamondCount) ||
        1;
      const diamondCount = unitDiamonds * repeatCount;
      const giftName =
        giftObj.name ||
        giftObj.giftName ||
        data?.extendedGiftInfo?.name ||
        data?.giftName ||
        `Regalo #${data?.giftId || 1}`;

      const event: IncomingGiftEvent = {
        uniqueId,
        nickname,
        avatarUrl,
        giftName: String(giftName),
        giftId: Number(data?.giftId || giftObj.id) || undefined,
        diamondCount,
        repeatCount,
        source: 'tiktok',
      };
      this.emit('gift', event);
    });

    conn.on(WebcastEvent.ROOM_USER, (data: any) => {
      const viewers = Number(data?.total ?? data?.viewerCount);
      if (!Number.isNaN(viewers) && viewers >= 0) {
        this.status.viewerCount = viewers;
        this.emit('status', this.getStatus());
      }
    });

    conn.on(WebcastEvent.STREAM_END, () => {
      this.status = {
        connected: false,
        connecting: false,
        username: this.status.username,
        mode: 'simulation',
        error: 'La transmisión de TikTok LIVE ha finalizado.',
      };
      this.connection = null;
      this.emit('status', this.getStatus());
    });

    conn.on(ControlEvent.DISCONNECTED, () => {
      if (!this.status.connected) return;
      this.status = {
        connected: false,
        connecting: false,
        username: this.status.username,
        mode: 'simulation',
        error: 'Desconectado de TikTok LIVE.',
      };
      this.connection = null;
      this.emit('status', this.getStatus());
    });

    conn.on(ControlEvent.ERROR, (err: any) => {
      console.error('[TikTokLiveAdapter] Warning/Error:', err?.info || err);
    });
  }
}
