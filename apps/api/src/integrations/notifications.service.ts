import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  NotificationMessage,
  SendNotificationRequest,
} from '@stokrova/contracts';
import { SendNotificationSchema } from '@stokrova/validation';
import { formatNotificationTemplate } from '@stokrova/domain';

@Injectable()
export class NotificationsService {
  private readonly notifications = new Map<string, NotificationMessage>();

  async sendNotification(
    tenantId: string,
    req: SendNotificationRequest,
  ): Promise<NotificationMessage> {
    const parsed = SendNotificationSchema.parse(req);

    const now = new Date().toISOString();
    const notification: NotificationMessage = {
      id: randomUUID(),
      tenant_id: tenantId,
      user_id: parsed.user_id ?? null,
      channel: parsed.channel,
      severity: parsed.severity,
      title: parsed.title.trim(),
      message: parsed.message.trim(),
      metadata: parsed.metadata,
      is_read: false,
      created_at: now,
    };

    this.notifications.set(notification.id, notification);
    return notification;
  }

  async sendTemplatedNotification(
    tenantId: string,
    params: {
      user_id?: string | null;
      channel: SendNotificationRequest['channel'];
      severity: SendNotificationRequest['severity'];
      titleTemplate: string;
      bodyTemplate: string;
      variables: Record<string, string | number>;
      metadata?: Record<string, unknown>;
    },
  ): Promise<NotificationMessage> {
    const renderedTitle = formatNotificationTemplate(params.titleTemplate, params.variables);
    const renderedBody = formatNotificationTemplate(params.bodyTemplate, params.variables);

    return this.sendNotification(tenantId, {
      user_id: params.user_id,
      channel: params.channel,
      severity: params.severity,
      title: renderedTitle,
      message: renderedBody,
      metadata: params.metadata,
    });
  }

  async listNotifications(
    tenantId: string,
    userId?: string,
  ): Promise<NotificationMessage[]> {
    return Array.from(this.notifications.values())
      .filter((n) => {
        if (n.tenant_id !== tenantId) return false;
        if (userId && n.user_id && n.user_id !== userId) return false;
        return true;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getUnreadCount(tenantId: string, userId?: string): Promise<number> {
    return Array.from(this.notifications.values()).filter((n) => {
      if (n.tenant_id !== tenantId) return false;
      if (userId && n.user_id && n.user_id !== userId) return false;
      return !n.is_read;
    }).length;
  }

  async markAsRead(
    tenantId: string,
    notificationId: string,
  ): Promise<NotificationMessage> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.tenant_id !== tenantId) {
      throw new NotFoundException(`Notification '${notificationId}' not found.`);
    }

    notification.is_read = true;
    return notification;
  }

  async markAllAsRead(tenantId: string, userId?: string): Promise<number> {
    let updated = 0;
    for (const notification of this.notifications.values()) {
      if (notification.tenant_id === tenantId && (!userId || notification.user_id === userId) && !notification.is_read) {
        notification.is_read = true;
        updated++;
      }
    }
    return updated;
  }
}
