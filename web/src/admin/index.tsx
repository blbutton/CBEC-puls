// AdminLayout：AntD Layout 侧边栏 + 顶栏 + Outlet
// 菜单配置在 Phase D 抽到 menu.ts，当前为骨架内联配置
import { useMemo, useState, type ReactNode } from "react";
import { Layout, Menu, Dropdown, Avatar, Breadcrumb, theme } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  MonitorOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAuthStore } from "@/store/auth";

const { Header, Sider, Content } = Layout;

interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
}

const MENU: MenuItem[] = [
  { key: "/admin", label: "首页", icon: <DashboardOutlined /> },
  { key: "/admin/users", label: "用户管理", icon: <UserOutlined /> },
  { key: "/admin/content", label: "内容管理", icon: <FileTextOutlined /> },
  { key: "/admin/monitor", label: "系统监控", icon: <MonitorOutlined /> },
  { key: "/admin/settings", label: "系统管理", icon: <SettingOutlined /> },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const selectedKey = useMemo(() => {
    // 精确匹配菜单项，回退到 /admin
    const hit = MENU.find((m) => m.key === pathname);
    return hit ? hit.key : "/admin";
  }, [pathname]);

  const breadcrumbTitle = useMemo(() => {
    const hit = MENU.find((m) => m.key === selectedKey);
    return hit?.label ?? "首页";
  }, [selectedKey]);

  const userMenu: MenuProps = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "退出登录",
        onClick: () => {
          logout();
          navigate("/login", { replace: true });
        },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={220}
      >
        <div
          style={{
            height: 56,
            margin: 8,
            borderRadius: 8,
            color: "#fff",
            fontWeight: 700,
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.08)",
          }}
        >
          {collapsed ? "ACG" : "ACG Hub 后台"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key)}
          items={MENU.map((m) => ({
            key: m.key,
            icon: m.icon,
            label: m.label,
          }))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 16px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{ fontSize: 18, cursor: "pointer" }}
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Breadcrumb
              items={[{ title: "后台" }, { title: breadcrumbTitle }]}
            />
          </div>
          <Dropdown menu={userMenu} placement="bottomRight">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                padding: "0 8px",
              }}
            >
              <Avatar icon={<UserOutlined />} />
              <span>{user?.username ?? "未登录"}</span>
              <DownOutlined style={{ fontSize: 12 }} />
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16 }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: 8,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminLayout;
