// 系统管理：角色权限 / 菜单管理 / 系统参数（Tabs）
import { useEffect, useState } from "react";
import {
  App,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  type TableColumnsType,
} from "antd";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { getStorage, setStorage } from "@/utils/storage";
import { ADMIN_PERMISSIONS, USER_PERMISSIONS } from "@/constants/permissions";
import type { Permission, Role } from "@/types";

const { Title, Paragraph } = Typography;

// ===== 角色权限相关 =====
type ModuleKey = "user" | "content" | "system";

// 权限按模块分组
const PERMISSION_GROUPS: {
  module: ModuleKey;
  label: string;
  permissions: Permission[];
}[] = [
  {
    module: "user",
    label: "用户管理",
    permissions: ["user:create", "user:edit", "user:delete", "user:toggle"],
  },
  {
    module: "content",
    label: "内容管理",
    permissions: [
      "content:create",
      "content:edit",
      "content:publish",
      "content:delete",
    ],
  },
  {
    module: "system",
    label: "系统管理",
    permissions: ["system:view", "system:edit"],
  },
];

// 各权限的中文展示文案
const PERM_OPTIONS: Record<ModuleKey, { label: string; value: Permission }[]> =
  {
    user: [
      { label: "创建", value: "user:create" },
      { label: "编辑", value: "user:edit" },
      { label: "删除", value: "user:delete" },
      { label: "启停", value: "user:toggle" },
    ],
    content: [
      { label: "创建", value: "content:create" },
      { label: "编辑", value: "content:edit" },
      { label: "发布", value: "content:publish" },
      { label: "删除", value: "content:delete" },
    ],
    system: [
      { label: "查看", value: "system:view" },
      { label: "编辑", value: "system:edit" },
    ],
  };

const ROLE_LABELS: Record<Role, string> = {
  admin: "管理员",
  user: "普通用户",
};

interface RolePermissionConfig {
  admin: Permission[];
  user: Permission[];
}

// ===== 菜单管理相关 =====
interface MenuConfig {
  key: string;
  label: string;
  icon: string;
  sort: number;
}

// 菜单初始数据（与 AdminLayout 中的菜单一致）
const DEFAULT_MENUS: MenuConfig[] = [
  { key: "/admin", label: "首页", icon: "DashboardOutlined", sort: 1 },
  { key: "/admin/users", label: "用户管理", icon: "UserOutlined", sort: 2 },
  {
    key: "/admin/content",
    label: "内容管理",
    icon: "FileTextOutlined",
    sort: 3,
  },
  {
    key: "/admin/monitor",
    label: "系统监控",
    icon: "MonitorOutlined",
    sort: 4,
  },
  {
    key: "/admin/settings",
    label: "系统管理",
    icon: "SettingOutlined",
    sort: 5,
  },
];

// ===== 系统参数相关 =====
interface SystemSettingsData {
  siteName: string;
  siteDesc: string;
  themeColor: string;
  pageSize: number;
  enableRegister: boolean;
  enableChat: boolean;
}

// 系统参数默认值
const DEFAULT_SETTINGS: SystemSettingsData = {
  siteName: "ACG Hub",
  siteDesc: "动漫社区管理平台",
  themeColor: "#7a6bff",
  pageSize: 10,
  enableRegister: true,
  enableChat: true,
};

interface RoleRow {
  key: string;
  role: Role;
}

export default function SystemSettings() {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState("role");

  // ----- 角色权限 -----
  // admin 权限固定不可修改，仅 user 权限可编辑
  const adminPerms: Permission[] = ADMIN_PERMISSIONS;
  const [userPerms, setUserPerms] = useState<Permission[]>(() => {
    const saved = getStorage<RolePermissionConfig>("system_role_permissions", {
      admin: ADMIN_PERMISSIONS,
      user: USER_PERMISSIONS,
    });
    return saved.user ?? USER_PERMISSIONS;
  });

  // 普通用户某个模块权限变更：合并该模块的勾选项与其他模块已有权限
  const onUserModuleChange = (module: ModuleKey, checked: Permission[]) => {
    const modulePerms = PERMISSION_GROUPS.find(
      (g) => g.module === module,
    )!.permissions;
    const others = userPerms.filter((p) => !modulePerms.includes(p));
    setUserPerms([...others, ...checked]);
  };

  const saveRolePermissions = () => {
    setStorage("system_role_permissions", {
      admin: adminPerms,
      user: userPerms,
    });
    message.success("角色权限保存成功");
  };

  // 角色权限表格列定义
  const roleColumns: TableColumnsType<RoleRow> = [
    {
      title: "角色",
      dataIndex: "role",
      width: 140,
      render: (role: Role) => (
        <Tag color={role === "admin" ? "purple" : "blue"}>
          {ROLE_LABELS[role]}
        </Tag>
      ),
    },
    ...PERMISSION_GROUPS.map((group) => ({
      title: group.label,
      key: group.module,
      render: (_: unknown, record: RoleRow) => {
        const isReadonly = record.role === "admin";
        const current = isReadonly ? adminPerms : userPerms;
        const value = current.filter((p) => group.permissions.includes(p));
        return (
          <Checkbox.Group
            options={PERM_OPTIONS[group.module]}
            value={value}
            disabled={isReadonly}
            onChange={(checked) => {
              if (!isReadonly)
                onUserModuleChange(group.module, checked as Permission[]);
            }}
          />
        );
      },
    })),
  ];

  const roleDataSource: RoleRow[] = [
    { key: "admin", role: "admin" },
    { key: "user", role: "user" },
  ];

  // ----- 菜单管理 -----
  const [menus, setMenus] = useState<MenuConfig[]>(() => {
    const saved = getStorage<MenuConfig[]>("system_menus", DEFAULT_MENUS);
    return [...saved].sort((a, b) => a.sort - b.sort);
  });

  // 上移 / 下移：交换相邻项并重新分配 sort，调整后自动保存
  const moveMenu = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= menus.length) return;
    const next = [...menus];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    const renumbered = next.map((m, i) => ({ ...m, sort: i + 1 }));
    setMenus(renumbered);
    setStorage("system_menus", renumbered);
    message.success("菜单排序已更新");
  };

  const menuColumns: TableColumnsType<MenuConfig> = [
    { title: "排序", dataIndex: "sort", width: 80 },
    { title: "菜单名称", dataIndex: "label" },
    {
      title: "路径",
      dataIndex: "key",
      render: (v: string) => <code>{v}</code>,
    },
    { title: "图标", dataIndex: "icon" },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_: unknown, _record: MenuConfig, index: number) => (
        <Space>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => moveMenu(index, -1)}
          >
            上移
          </Button>
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={index === menus.length - 1}
            onClick={() => moveMenu(index, 1)}
          >
            下移
          </Button>
        </Space>
      ),
    },
  ];

  // ----- 系统参数 -----
  const [form] = Form.useForm<SystemSettingsData>();

  useEffect(() => {
    const saved = getStorage<SystemSettingsData>(
      "system_settings",
      DEFAULT_SETTINGS,
    );
    form.setFieldsValue(saved);
  }, [form]);

  const saveSettings = () => {
    form.validateFields().then((values) => {
      setStorage("system_settings", values);
      message.success("系统参数保存成功");
    });
  };

  const resetSettings = () => {
    form.setFieldsValue(DEFAULT_SETTINGS);
    setStorage("system_settings", DEFAULT_SETTINGS);
    message.success("已重置为默认值");
  };

  return (
    <div>
      <Title level={3}>系统管理</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "role",
            label: "角色权限",
            children: (
              <Card bordered={false}>
                <Paragraph type="secondary">
                  管理员权限固定不可修改；普通用户权限可勾选调整，点击「保存」后生效。
                </Paragraph>
                <Table
                  columns={roleColumns}
                  dataSource={roleDataSource}
                  rowKey="key"
                  pagination={false}
                  bordered
                  size="middle"
                />
                <Space style={{ marginTop: 16 }}>
                  <Button type="primary" onClick={saveRolePermissions}>
                    保存
                  </Button>
                </Space>
              </Card>
            ),
          },
          {
            key: "menu",
            label: "菜单管理",
            children: (
              <Card bordered={false}>
                <Paragraph type="secondary">
                  后台菜单展示顺序可通过「上移 / 下移」调整，调整后自动保存到
                  localStorage。
                </Paragraph>
                <Table
                  columns={menuColumns}
                  dataSource={menus}
                  rowKey="key"
                  pagination={false}
                  size="middle"
                />
              </Card>
            ),
          },
          {
            key: "settings",
            label: "系统参数",
            children: (
              <Card bordered={false}>
                <Paragraph type="secondary">
                  站点全局参数配置，保存后写入 localStorage。
                </Paragraph>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={DEFAULT_SETTINGS}
                  style={{ maxWidth: 520 }}
                >
                  <Form.Item
                    name="siteName"
                    label="站点名称"
                    rules={[{ required: true, message: "请输入站点名称" }]}
                  >
                    <Input placeholder="请输入站点名称" />
                  </Form.Item>
                  <Form.Item name="siteDesc" label="站点描述">
                    <Input placeholder="请输入站点描述" />
                  </Form.Item>
                  <Form.Item name="themeColor" label="主题色">
                    <input
                      type="color"
                      style={{
                        width: 64,
                        height: 32,
                        padding: 0,
                        border: "1px solid #d9d9d9",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: "transparent",
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="pageSize"
                    label="每页条数"
                    rules={[{ required: true, message: "请输入每页条数" }]}
                  >
                    <InputNumber min={1} max={100} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item
                    name="enableRegister"
                    label="开启注册"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name="enableChat"
                    label="开启聊天室"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button type="primary" onClick={saveSettings}>
                        保存
                      </Button>
                      <Button onClick={resetSettings}>重置</Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
