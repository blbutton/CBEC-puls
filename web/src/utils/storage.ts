type StorageType = "local" | "session";

interface StorageOptions {
  /** 存储类型 localStorage / sessionStorage */
  storageType?: StorageType;
  /** 过期时间，毫秒，0代表永不过期 */
  expire?: number;
  /** 命名空间前缀，隔离不同业务模块 */
  namespace?: string;
  /** 版本号，版本不匹配自动丢弃旧数据 */
  version?: number;
}

/** 存储元数据结构 */
interface StorageMeta<T> {
  data: T;
  expireAt: number | null;
  version: number;
}

/** 默认配置 */
const DEFAULT_OPTIONS: Required<StorageOptions> = {
  storageType: "local",
  expire: 0,
  namespace: "",
  version: 1,
};

/** 获取真实存储实例，SSR环境返回null */
function getStorageInstance(type: StorageType): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return type === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    // 隐私模式 / 浏览器禁用存储
    return null;
  }
}

/** 拼接带命名空间的key */
function buildKey(rawKey: string, namespace: string): string {
  return namespace ? `${namespace}:${rawKey}` : rawKey;
}

/**
 * 获取存储数据，自动校验过期、版本
 * @param key 键名
 * @param fallback 兜底默认值
 * @param options 配置
 */
export function getStorage<T>(
  key: string,
  fallback: T,
  options?: StorageOptions,
): T {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorageInstance(opts.storageType);
  if (!storage) return fallback;

  const realKey = buildKey(key, opts.namespace);
  let raw: string | null;

  try {
    raw = storage.getItem(realKey);
  } catch (err) {
    console.warn(`[Storage] get item error key=${realKey}`, err);
    return fallback;
  }

  if (raw === null) return fallback;

  let parsed: StorageMeta<T>;
  try {
    parsed = JSON.parse(raw) as StorageMeta<T>;
  } catch (err) {
    console.warn(`[Storage] parse json fail key=${realKey}`, err);
    return fallback;
  }

  // 版本校验不匹配直接丢弃
  if (parsed.version !== opts.version) {
    removeStorage(key, opts);
    return fallback;
  }

  // 过期校验
  if (parsed.expireAt !== null && Date.now() > parsed.expireAt) {
    removeStorage(key, opts);
    return fallback;
  }

  return parsed.data;
}

/**
 * 设置存储，支持过期、版本、命名空间
 * @param key 键
 * @param value 值
 * @param options 配置
 */
export function setStorage<T>(
  key: string,
  value: T,
  options?: StorageOptions,
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorageInstance(opts.storageType);
  if (!storage) return false;

  const realKey = buildKey(key, opts.namespace);
  const meta: StorageMeta<T> = {
    data: value,
    expireAt: opts.expire > 0 ? Date.now() + opts.expire : null,
    version: opts.version,
  };

  try {
    const payload = JSON.stringify(meta);
    storage.setItem(realKey, payload);
    return true;
  } catch (err) {
    // 存储溢出、异常
    console.warn(`[Storage] set item fail key=${realKey}`, err);
    return false;
  }
}

/** 删除存储项 */
export function removeStorage(key: string, options?: StorageOptions): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorageInstance(opts.storageType);
  if (!storage) return false;
  const realKey = buildKey(key, opts.namespace);
  try {
    storage.removeItem(realKey);
    return true;
  } catch (err) {
    console.warn(`[Storage] remove item fail key=${realKey}`, err);
    return false;
  }
}

/**
 * 写入原始字符串，不包裹meta元信息，适合token这类原生字符串
 */
export function setRawStorage(
  key: string,
  value: string,
  options?: StorageOptions,
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorageInstance(opts.storageType);
  if (!storage) return false;
  const realKey = buildKey(key, opts.namespace);
  try {
    storage.setItem(realKey, value);
    return true;
  } catch (err) {
    console.warn(`[Storage] setRawStorage fail key=${realKey}`, err);
    return false;
  }
}

/** 获取原始字符串，不解析JSON，不校验过期版本 */
export function getRawStorage(
  key: string,
  options?: StorageOptions,
): string | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorageInstance(opts.storageType);
  if (!storage) return null;
  const realKey = buildKey(key, opts.namespace);
  try {
    return storage.getItem(realKey);
  } catch (err) {
    console.warn(`[Storage] getRawStorage fail key=${realKey}`, err);
    return null;
  }
}

/**
 * 清空指定命名空间下全部存储
 */
export function clearNamespaceStorage(options?: StorageOptions): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const storage = getStorageInstance(opts.storageType);
  if (!storage || !opts.namespace) return false;
  const prefix = `${opts.namespace}:`;
  const removeKeys: string[] = [];

  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(prefix)) {
        removeKeys.push(k);
      }
    }
    removeKeys.forEach((k) => storage.removeItem(k));
    return true;
  } catch (err) {
    console.warn("[Storage] clearNamespaceStorage error", err);
    return false;
  }
}

/**
 * 粗略估算剩余可用空间（仅参考）
 */
export function estimateStorageQuota(): { used: number; total: number | null } {
  if (typeof window === "undefined") return { used: 0, total: null };
  let totalSize = 0;
  const ls = window.localStorage;
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (!k) continue;
    const v = ls.getItem(k);
    totalSize += k.length + (v?.length ?? 0);
  }
  // 单位字符，1字符≈2字节
  return { used: totalSize * 2, total: 5 * 1024 * 1024 };
}

/**
 * 批量设置
 */
export function batchSetStorage<T>(
  entries: Array<{ key: string; value: T }>,
  options?: StorageOptions,
): boolean[] {
  return entries.map((item) => setStorage(item.key, item.value, options));
}
