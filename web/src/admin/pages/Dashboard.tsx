// 后台首页：欢迎区 + 4 张 StatCard + 纯 SVG 折线/柱状图 + 快捷操作
import { useEffect, useState, useId, type ReactNode } from "react";
import { Card, Typography, Skeleton, theme, Row, Col } from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  EyeOutlined,
  DashboardOutlined,
  MonitorOutlined,
  SettingOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import {
  fetchMetric,
  fetchMetricHistory,
  fetchCategoryStats,
  type MetricHistory,
} from "@/services/monitor";
import { fetchUsers } from "@/services/user";
import { fetchContents } from "@/services/content";
import { formatNumber, formatPercent, formatDate } from "@/utils/format";
import type { CategoryStat } from "@/types/api";

const { Title, Text } = Typography;

// ============ 统计卡片 ============
interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  gradient: string;
  loading?: boolean;
}

function StatCard({ title, value, icon, gradient, loading }: StatCardProps) {
  return (
    <Card style={{ overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            color: "#fff",
            background: gradient,
            boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {title}
          </Text>
          {loading ? (
            <Skeleton.Input
              active
              size="small"
              style={{ width: 96, marginTop: 4 }}
            />
          ) : (
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.3,
                marginTop: 2,
                transition: "all 0.4s ease",
              }}
            >
              {value}
            </div>
          )}
        </div>
      </div>
      {/* 右上角装饰光斑 */}
      <div
        style={{
          position: "absolute",
          right: -24,
          top: -24,
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: gradient,
          opacity: 0.08,
          pointerEvents: "none",
        }}
      />
    </Card>
  );
}

// ============ 折线图（纯 SVG 手绘） ============
interface LineChartProps {
  labels: string[];
  data: number[];
  color: string;
}

function LineChart({ labels, data, color }: LineChartProps) {
  const W = 600;
  const H = 250;
  const padL = 48;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const [hover, setHover] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 唯一渐变 id，避免多实例冲突
  const rawId = useId();
  const gradId = `line-grad-${rawId.replace(/:/g, "")}`;

  const max = Math.max(...data, 1);
  // Y 轴最大值向上取整到 100 的倍数
  const yMax = Math.max(Math.ceil(max / 100) * 100, 100);
  const yTicks = Array.from({ length: 5 }, (_, i) =>
    Math.round((yMax / 4) * i),
  );

  const xFor = (i: number) => padL + (plotW * i) / Math.max(data.length - 1, 1);
  const yFor = (v: number) => padT + plotH - (plotH * v) / yMax;

  const linePath = data
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`,
    )
    .join(" ");
  const areaPath = `${linePath} L ${xFor(data.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  return (
    <div style={{ position: "relative", color: "inherit" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Y 轴刻度 + 横向网格线 */}
        {yTicks.map((t) => {
          const y = yFor(t);
          return (
            <g key={t}>
              <line
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="3 3"
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {formatNumber(t)}
              </text>
            </g>
          );
        })}

        {/* 坐标轴线 */}
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + plotH}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
        <line
          x1={padL}
          y1={padT + plotH}
          x2={W - padR}
          y2={padT + plotH}
          stroke="currentColor"
          strokeOpacity={0.2}
        />

        {/* 区域填充（渐变 + 淡入） */}
        <path
          d={areaPath}
          fill={`url(#${gradId})`}
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.8s ease 0.4s",
          }}
        />

        {/* 折线（pathLength=1 实现描边绘制动画） */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={mounted ? 0 : 1}
          style={{ transition: "stroke-dashoffset 1.2s ease" }}
        />

        {/* 数据点 + 透明热区（用于 hover） + X 轴标签 */}
        {data.map((v, i) => (
          <g key={i}>
            <circle
              cx={xFor(i)}
              cy={yFor(v)}
              r={hover === i ? 6 : 4}
              fill="#fff"
              stroke={color}
              strokeWidth={2}
              style={{
                transition: "r 0.2s ease",
                opacity: mounted ? 1 : 0,
              }}
            />
            <rect
              x={xFor(i) - plotW / data.length / 2}
              y={padT}
              width={plotW / data.length}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            <text
              x={xFor(i)}
              y={padT + plotH + 18}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
              fillOpacity={0.6}
            >
              {labels[i]}
            </text>
          </g>
        ))}
      </svg>

      {/* hover 提示气泡 */}
      {hover !== null && (
        <div
          style={{
            position: "absolute",
            left: `${(xFor(hover) / W) * 100}%`,
            top: `${(yFor(data[hover]) / H) * 100}%`,
            transform: "translate(-50%, -130%)",
            background: "rgba(0,0,0,0.78)",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {labels[hover]}：{formatNumber(data[hover])}
        </div>
      )}
    </div>
  );
}

// ============ 柱状图（纯 SVG 手绘） ============
interface BarChartProps {
  labels: string[];
  data: number[];
  colors: string[];
}

function BarChart({ labels, data, colors }: BarChartProps) {
  const W = 400;
  const H = 250;
  const padL = 40;
  const padR = 16;
  const padT = 20;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const max = Math.max(...data, 1);
  // 柱状图数值通常较小，向上取整到 10 的倍数
  const yMax = Math.max(Math.ceil(max / 10) * 10, 10);
  const yTicks = [0, Math.round(yMax / 2), yMax];

  const barGap = 10;
  const barW =
    data.length > 0 ? (plotW - barGap * (data.length - 1)) / data.length : 0;
  const xFor = (i: number) => padL + i * (barW + barGap);
  const yFor = (v: number) => padT + plotH - (plotH * v) / yMax;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {/* Y 轴刻度 + 网格 */}
      {yTicks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="3 3"
            />
            <text
              x={padL - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fill="currentColor"
              fillOpacity={0.5}
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* 坐标轴线 */}
      <line
        x1={padL}
        y1={padT}
        x2={padL}
        y2={padT + plotH}
        stroke="currentColor"
        strokeOpacity={0.2}
      />
      <line
        x1={padL}
        y1={padT + plotH}
        x2={W - padR}
        y2={padT + plotH}
        stroke="currentColor"
        strokeOpacity={0.2}
      />

      {/* 柱子（从底部生长动画） + 数值标签 + X 轴标签 */}
      {data.map((v, i) => {
        const x = xFor(i);
        const y = yFor(v);
        const targetH = padT + plotH - y;
        const h = mounted ? targetH : 0;
        const yRendered = mounted ? y : padT + plotH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={yRendered}
              width={barW}
              height={Math.max(h, 0)}
              rx={4}
              ry={4}
              fill={colors[i % colors.length]}
              style={{
                transition:
                  "y 0.8s cubic-bezier(0.2,0.8,0.2,1), height 0.8s cubic-bezier(0.2,0.8,0.2,1)",
              }}
            />
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="currentColor"
              fillOpacity={mounted ? 0.85 : 0}
              style={{ transition: "opacity 0.6s ease 0.5s" }}
            >
              {v}
            </text>
            <text
              x={x + barW / 2}
              y={padT + plotH + 18}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
              fillOpacity={0.6}
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ============ 快捷操作入口 ============
interface QuickAction {
  title: string;
  desc: string;
  path: string;
  icon: ReactNode;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "用户管理",
    desc: "维护系统用户、角色与权限",
    path: "/admin/users",
    icon: <UserOutlined />,
    color: "#722ed1",
  },
  {
    title: "内容管理",
    desc: "发布 / 审核 / 下架站点内容",
    path: "/admin/content",
    icon: <FileTextOutlined />,
    color: "#13c2c2",
  },
  {
    title: "系统监控",
    desc: "实时查看服务器指标与日志",
    path: "/admin/monitor",
    icon: <MonitorOutlined />,
    color: "#fa8c16",
  },
  {
    title: "系统设置",
    desc: "站点配置与全局参数",
    path: "/admin/settings",
    icon: <SettingOutlined />,
    color: "#52c41a",
  },
];

// 柱状图配色（每个柱子不同色）
const BAR_COLORS = [
  "#5B8FF9",
  "#5AD8A6",
  "#F6BD16",
  "#E86452",
  "#6DC8EC",
  "#945FB9",
  "#FF9845",
  "#5D7092",
];

// ============ 主组件 ============
export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    token: { colorPrimary, colorText },
  } = theme.useToken();

  const [loading, setLoading] = useState(true);
  const [userTotal, setUserTotal] = useState(0);
  const [contentTotal, setContentTotal] = useState(0);
  const [todayVisits, setTodayVisits] = useState(0);
  const [cpuLoad, setCpuLoad] = useState(0);
  const [history, setHistory] = useState<MetricHistory | null>(null);
  const [categories, setCategories] = useState<CategoryStat[]>([]);

  // 当前日期时间，每秒刷新
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 并行拉取所有首页数据
  useEffect(() => {
    let active = true;
    Promise.all([
      fetchUsers({ page: 1, pageSize: 1 }),
      fetchContents({ page: 1, pageSize: 1 }),
      fetchMetricHistory(),
      fetchMetric(),
      fetchCategoryStats(),
    ])
      .then(([users, contents, hist, metric, cats]) => {
        if (!active) return;
        setUserTotal(users.total);
        setContentTotal(contents.total);
        // 今日访问 = 历史序列最后一天的访问量
        setTodayVisits(hist.series[0]?.data.at(-1) ?? 0);
        setCpuLoad(metric.cpu);
        setHistory(hist);
        setCategories(cats);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const lineLabels = history?.labels ?? [];
  const lineData = history?.series[0]?.data ?? [];
  const catLabels = categories.map((c) => c.category);
  const catData = categories.map((c) => c.count);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 欢迎区 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            欢迎回来，{user?.username ?? "管理员"}
          </Title>
          <Text type="secondary">{formatDate(now, true)}</Text>
        </div>
      </div>

      {/* StatCard 一行四个 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="用户总数"
            value={formatNumber(userTotal)}
            icon={<UserOutlined />}
            gradient="linear-gradient(135deg, #722ed1, #4096ff)"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="内容总数"
            value={formatNumber(contentTotal)}
            icon={<FileTextOutlined />}
            gradient="linear-gradient(135deg, #13c2c2, #36cfc9)"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="今日访问"
            value={formatNumber(todayVisits)}
            icon={<EyeOutlined />}
            gradient="linear-gradient(135deg, #52c41a, #95de64)"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="系统负载"
            value={formatPercent(cpuLoad)}
            icon={<DashboardOutlined />}
            gradient="linear-gradient(135deg, #fa8c16, #ffc069)"
            loading={loading}
          />
        </Col>
      </Row>

      {/* 图表两列：折线图 60% / 柱状图 40% */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card
            title="近 7 天访问量趋势"
            styles={{ body: { padding: "12px 16px 8px", color: colorText } }}
          >
            {loading || !history ? (
              <Skeleton.Image active style={{ width: "100%", height: 220 }} />
            ) : (
              <LineChart
                labels={lineLabels}
                data={lineData}
                color={colorPrimary}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card
            title="内容分类统计"
            styles={{ body: { padding: "12px 16px 8px", color: colorText } }}
          >
            {loading || categories.length === 0 ? (
              <Skeleton.Image active style={{ width: "100%", height: 220 }} />
            ) : (
              <BarChart labels={catLabels} data={catData} colors={BAR_COLORS} />
            )}
          </Card>
        </Col>
      </Row>

      {/* 快捷操作 */}
      <Card title="快捷操作">
        <Row gutter={[16, 16]}>
          {QUICK_ACTIONS.map((a) => (
            <Col xs={24} sm={12} lg={6} key={a.path}>
              <div
                onClick={() => navigate(a.path)}
                style={{
                  cursor: "pointer",
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.06)",
                  transition: "box-shadow 0.2s, transform 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 6px 18px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: a.color,
                    color: "#fff",
                    fontSize: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{a.title}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {a.desc}
                  </Text>
                </div>
                <ArrowRightOutlined style={{ color: a.color }} />
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
