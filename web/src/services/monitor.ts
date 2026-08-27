// 系统监控 API 服务
//
// 说明：mall-swarm 后端 API 文档（api-interfaces.html）未提供 CPU/内存/磁盘指标、
// 操作日志、在线用户等系统监控接口。本服务在无后端支撑时返回安全空数据，
// 使前端监控页面保持可用（展示空状态），避免阻塞编译与运行。
//
// 若后续后端补充监控接口，仅需将下列函数的实现替换为真实请求即可，
// 调用方（SystemMonitor / Dashboard）无需改动。

import type {
  CategoryStat,
  MetricHistory,
  OnlineUser,
} from "@/types/api";
import type { OperationLog, ServerMetric } from "@/types";

// 重新导出类型，便于 Dashboard 等页面按需引用
export type { MetricHistory };

/**
 * 获取当前服务器指标
 * 后端无对应接口，返回零值占位。
 */
export async function fetchMetric(): Promise<ServerMetric> {
  return {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    timestamp: Date.now(),
  };
}

/**
 * 获取指标历史（用于折线图）
 * 后端无对应接口，返回空序列。
 */
export async function fetchMetricHistory(): Promise<MetricHistory> {
  return {
    labels: [],
    series: [],
  };
}

/**
 * 获取分类统计
 * 后端无对应接口，返回空数组。
 */
export async function fetchCategoryStats(): Promise<CategoryStat[]> {
  return [];
}

/**
 * 获取操作日志
 * 后端无对应接口，返回空数组。
 * @param level 日志级别（"all" 表示全部）
 */
export async function fetchLogs(
  level: "all" | "info" | "warn" | "error",
): Promise<OperationLog[]> {
  void level;
  return [];
}

/**
 * 获取在线用户列表
 * 后端无对应接口，返回空数组。
 */
export async function fetchOnlineUsers(): Promise<OnlineUser[]> {
  return [];
}
