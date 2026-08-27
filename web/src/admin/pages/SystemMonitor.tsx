// 系统监控：实时指标卡片 + 操作日志 + 在线用户
import { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Row,
  Col,
  Table,
  Tag,
  Radio,
  Space,
  message,
} from "antd";
import type { TablePaginationConfig } from "antd";
import { fetchMetric, fetchLogs, fetchOnlineUsers } from "@/services/monitor";
import type { ServerMetric, OperationLog, LogLevel } from "@/types";
import { formatPercent, formatNumber } from "@/utils/format";
import type { OnlineUser } from "@/types/api";

const { Title, Paragraph, Text } = Typography;

// 主题色映射
const THEME_COLORS: Record<string, string> = {
  cpu: "#1677ff", // 蓝
  memory: "#52c41a", // 绿
  disk: "#fa8c16", // 橙
  network: "#722ed1", // 紫
};

// 日志级别 Tag 颜色映射
const LEVEL_TAG_COLOR: Record<LogLevel, string> = {
  info: "blue",
  warn: "orange",
  error: "red",
};

const LEVEL_LABEL: Record<LogLevel | "all", string> = {
  all: "全部",
  info: "信息",
  warn: "警告",
  error: "错误",
};

/**
 * 圆形进度环组件
 * 使用 SVG stroke-dasharray / stroke-dashoffset 控制进度，附带 CSS transition 动画
 */
function CircleProgress({
  value,
  color,
  size = 120,
}: {
  value: number;
  color: string;
  size?: number;
}) {
  // viewBox 固定为 120x120，半径 52，周长 = 2 * π * 52 ≈ 326.73
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  // 限制 0~100，避免负数或超过满环
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{ display: "block" }}
    >
      {/* 背景圆环 */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth="10"
      />
      {/* 进度圆环，旋转 -90deg 使起点位于顶部 */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
        style={{
          transition: "stroke-dashoffset 0.6s ease",
        }}
      />
      {/* 中心百分比文字 */}
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="20"
        fontWeight="600"
        fill={color}
      >
        {formatPercent(clamped, 0)}
      </text>
    </svg>
  );
}

// 默认指标
const DEFAULT_METRIC: ServerMetric = {
  cpu: 0,
  memory: 0,
  disk: 0,
  network: 0,
  timestamp: Date.now(),
};

export default function SystemMonitor() {
  // 实时指标
  const [metric, setMetric] = useState<ServerMetric>(DEFAULT_METRIC);
  // 操作日志
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [logLevel, setLogLevel] = useState<LogLevel | "all">("all");
  const [logsLoading, setLogsLoading] = useState(true);
  // 在线用户
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // 拉取实时指标（每 3 秒刷新一次）
  useEffect(() => {
    let active = true;
    const loadMetric = async () => {
      try {
        const data = await fetchMetric();
        if (active) setMetric(data);
      } catch {
        // 静默失败，避免定时器频繁弹出错误
      }
    };
    loadMetric();
    const timer = setInterval(loadMetric, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // 拉取操作日志
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchLogs(logLevel);
        if (!active) return;
        setLogs(data);
      } catch {
        if (active) message.error("操作日志加载失败");
      } finally {
        if (active) setLogsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [logLevel]);

  // 拉取在线用户
  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const data = await fetchOnlineUsers();
        if (active) setOnlineUsers(data);
      } catch {
        message.error("在线用户加载失败");
      } finally {
        if (active) setUsersLoading(false);
      }
    };
    loadUsers();
    return () => {
      active = false;
    };
  }, []);

  // 日志表格列定义
  const logColumns = [
    {
      title: "用户",
      dataIndex: "user",
      key: "user",
      width: 120,
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      ellipsis: true,
    },
    {
      title: "级别",
      dataIndex: "level",
      key: "level",
      width: 90,
      render: (level: LogLevel) => (
        <Tag color={LEVEL_TAG_COLOR[level]}>{LEVEL_LABEL[level]}</Tag>
      ),
    },
    {
      title: "时间",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 180,
    },
  ];

  // 在线用户表格列定义
  const userColumns = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "IP 地址",
      dataIndex: "ip",
      key: "ip",
    },
    {
      title: "登录位置",
      dataIndex: "location",
      key: "location",
    },
    {
      title: "登录时间",
      dataIndex: "loginAt",
      key: "loginAt",
    },
  ];

  // 分页配置
  const pagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total: logs.length,
    showSizeChanger: true,
    pageSizeOptions: ["5", "8", "10", "20"],
    onChange: (p, ps) => {
      setPage(p);
      setPageSize(ps);
    },
    showTotal: (total) => `共 ${total} 条`,
  };

  // 指标卡片配置
  const metricCards = [
    {
      key: "cpu" as const,
      title: "CPU 使用率",
      value: metric.cpu,
      color: THEME_COLORS.cpu,
      isProgress: true,
    },
    {
      key: "memory" as const,
      title: "内存使用率",
      value: metric.memory,
      color: THEME_COLORS.memory,
      isProgress: true,
    },
    {
      key: "disk" as const,
      title: "磁盘使用率",
      value: metric.disk,
      color: THEME_COLORS.disk,
      isProgress: true,
    },
    {
      key: "network" as const,
      title: "网络流量",
      value: metric.network,
      color: THEME_COLORS.network,
      isProgress: false,
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Title level={3}>系统监控</Title>
      <Paragraph type="secondary">
        实时查看服务器资源占用、操作日志与在线用户情况。指标每 3 秒自动刷新。
      </Paragraph>

      {/* 顶部：4 张指标卡片一行排列 */}
      <Row gutter={[16, 16]}>
        {metricCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.key}>
            <Card>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "8px 0",
                }}
              >
                <Text type="secondary" style={{ marginBottom: 12 }}>
                  {card.title}
                </Text>
                {card.isProgress ? (
                  <CircleProgress value={card.value} color={card.color} />
                ) : (
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: card.color,
                    }}
                  >
                    <span style={{ fontSize: 26, fontWeight: 600 }}>
                      {formatNumber(card.value)}
                    </span>
                    <span style={{ fontSize: 14, marginTop: 4 }}>KB/s</span>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 下方：左 60% 操作日志，右 40% 在线用户 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14} xxl={15}>
          <Card
            title="操作日志"
            extra={
              <Radio.Group
                value={logLevel}
                onChange={(e) => {
                  setLogsLoading(true);
                  setLogLevel(e.target.value);
                  setPage(1);
                }}
                optionType="button"
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="all">全部</Radio.Button>
                <Radio.Button value="info">信息</Radio.Button>
                <Radio.Button value="warn">警告</Radio.Button>
                <Radio.Button value="error">错误</Radio.Button>
              </Radio.Group>
            }
          >
            <Table
              rowKey="id"
              columns={logColumns}
              dataSource={logs}
              loading={logsLoading}
              pagination={pagination}
              size="middle"
              scroll={{ x: 480 }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10} xxl={9}>
          <Card title="在线用户">
            <Table
              rowKey="id"
              columns={userColumns}
              dataSource={onlineUsers}
              loading={usersLoading}
              size="middle"
              pagination={false}
              scroll={{ x: 380 }}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
