/**
 * Event Emitter
 * Async event-driven system for state changes and notifications
 */

import EventEmitter from 'events';
import { logger } from '@utils/logger';

export type EventListener<T = unknown> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  event: string;
  listener: EventListener;
  once: boolean;
}

export class AppEventEmitter {
  private emitter: EventEmitter;
  private subscriptions: Map<string, EventSubscription>;
  private eventHistory: Map<string, unknown[]>;
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.emitter = new EventEmitter();
    this.subscriptions = new Map();
    this.eventHistory = new Map();
    this.maxHistorySize = maxHistorySize;
    this.setupDefaultListeners();
  }

  /**
   * Setup default event handlers
   */
  private setupDefaultListeners(): void {
    this.emitter.on('error', (error) => {
      logger.error('EventEmitter error', error);
    });
  }

  /**
   * Subscribe to an event
   */
  subscribe<T = unknown>(event: string, listener: EventListener<T>): string {
    const id = `${event}-${Date.now()}-${Math.random()}`;
    const subscription: EventSubscription = {
      id,
      event,
      listener: listener as EventListener,
      once: false,
    };

    this.subscriptions.set(id, subscription);
    this.emitter.on(event, listener);

    logger.debug(`Subscribed to event: ${event} (${id})`);
    return id;
  }

  /**
   * Subscribe to event once
   */
  subscribeOnce<T = unknown>(event: string, listener: EventListener<T>): string {
    const id = `${event}-once-${Date.now()}-${Math.random()}`;
    const subscription: EventSubscription = {
      id,
      event,
      listener: listener as EventListener,
      once: true,
    };

    this.subscriptions.set(id, subscription);
    this.emitter.once(event, listener);

    logger.debug(`Subscribed once to event: ${event} (${id})`);
    return id;
  }

  /**
   * Unsubscribe from event
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    this.emitter.removeListener(subscription.event, subscription.listener);
    this.subscriptions.delete(subscriptionId);

    logger.debug(`Unsubscribed from event: ${subscription.event} (${subscriptionId})`);
    return true;
  }

  /**
   * Emit event
   */
  async emit<T = unknown>(event: string, data: T): Promise<void> {
    try {
      // Store in history
      this.addToHistory(event, data);

      // Emit event
      this.emitter.emit(event, data);

      logger.debug(`Event emitted: ${event}`, { data });
    } catch (error) {
      logger.error(`Error emitting event: ${event}`, error);
      throw error;
    }
  }

  /**
   * Emit event and wait for all listeners
   */
  async emitAsync<T = unknown>(event: string, data: T): Promise<void> {
    try {
      // Store in history
      this.addToHistory(event, data);

      const listeners = this.emitter.listeners(event);
      const promises = listeners.map((listener) => {
        return Promise.resolve((listener as EventListener)(data));
      });

      await Promise.all(promises);

      logger.debug(`Async event emitted and awaited: ${event}`);
    } catch (error) {
      logger.error(`Error in async event emission: ${event}`, error);
      throw error;
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: string, data: unknown): void {
    if (!this.eventHistory.has(event)) {
      this.eventHistory.set(event, []);
    }

    const history = this.eventHistory.get(event)!;
    history.push(data);

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Get event history
   */
  getHistory(event: string): unknown[] {
    return this.eventHistory.get(event) || [];
  }

  /**
   * Clear event history
   */
  clearHistory(event?: string): void {
    if (event) {
      this.eventHistory.delete(event);
    } else {
      this.eventHistory.clear();
    }
  }

  /**
   * Get listener count for event
   */
  listenerCount(event: string): number {
    return this.emitter.listenerCount(event);
  }

  /**
   * Get all events
   */
  eventNames(): string[] {
    return this.emitter.eventNames() as string[];
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(event?: string): void {
    this.emitter.removeAllListeners(event);
    
    if (event) {
      const toDelete = Array.from(this.subscriptions.values())
        .filter((sub) => sub.event === event)
        .map((sub) => sub.id);
      
      toDelete.forEach((id) => this.subscriptions.delete(id));
    } else {
      this.subscriptions.clear();
    }
  }

  /**
   * Get subscription details
   */
  getSubscription(subscriptionId: string): EventSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get all subscriptions for event
   */
  getSubscriptions(event: string): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter((sub) => sub.event === event);
  }
}

export const eventEmitter = new AppEventEmitter();
export default AppEventEmitter;
