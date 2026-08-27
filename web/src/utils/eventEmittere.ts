import EVENT_NAMES from "@/config/event";

type EventName = (typeof EVENT_NAMES)[number];

interface EventMap {
  API_REQUEST_START: [message: string];
  API_REQUEST_SUCCESS: [message: string];
  API_REQUEST_FAIL: [message: string];
  API_REQUEST_COMPLETE: [message: string];
  API_HTTP_ERROR: [message: string];
  API_NETWORK_ERROR: [message: string];
  API_TIMEOUT: [message: string];
  API_ABORT: [message: string];
  API_CANCEL: [message: string];
  API_AUTH_EXPIRED: [message: string];
  API_AUTH_FORBIDDEN: [message: string];
  API_BUSINESS_ERROR: [message: string];
  API_RETRY: [message: string];
  API_RETRY_FAIL: [message: string];
  API_CACHE_HIT: [message: string];
  API_CACHE_MISS: [message: string];
  API_PERFORMANCE: [message: string];
  API_SLOW: [message: string];
  LOG: [message: string];
  ERROR: [message: string];
  REFRESH: [message: string];
}

type EventCallback<K extends EventName> = (...args: EventMap[K]) => void;

class EventEmitter {
  private readonly listeners: {
    [K in EventName]: Set<EventCallback<K>>;
  };

  constructor() {
    this.listeners = {} as typeof this.listeners;
    for (const name of EVENT_NAMES) {
      this.listeners[name] = new Set();
    }
  }

  on<K extends EventName>(eventName: K, callback: EventCallback<K>): void {
    this.listeners[eventName].add(callback);
  }

  once<K extends EventName>(eventName: K, callback: EventCallback<K>): void {
    const wrapper = ((...args: EventMap[K]) => {
      this.off(eventName, wrapper);
      callback(...args);
    }) as EventCallback<K>;
    this.on(eventName, wrapper);
  }

  emit<K extends EventName>(eventName: K, ...args: EventMap[K]): void {
    const set = this.listeners[eventName];
    console.debug(`[EventEmitter] emit ${eventName}`, {
      args,
      count: set.size,
    });
    set.forEach((cb) => {
      try {
        cb(...args);
      } catch (err) {
        console.error(`[EventEmitter] event ${eventName} callback error`, err);
      }
    });
  }

  off<K extends EventName>(eventName: K, callback: EventCallback<K>): void {
    this.listeners[eventName].delete(callback);
  }

  clear<K extends EventName>(eventName: K): void {
    this.listeners[eventName].clear();
  }

  clearAll(): void {
    for (const name of EVENT_NAMES) {
      this.listeners[name].clear();
    }
  }
}

const emitter = new EventEmitter();

export default emitter;
