// 用户管理：分页 Table + 搜索/筛选 + 新增/编辑/删除 + 启停切换
import { useEffect, useState } from "react";
import {
  App,
  Avatar,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  type TableProps,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/store/auth";
import {
  createUser,
  deleteUser,
  fetchUsers,
  toggleUserStatus,
  updateUser,
} from "@/services/user";
import type { Role, User } from "@/types";
import type { UserForm } from "@/types/api";

// 搜索栏状态下拉选项
const STATUS_OPTIONS: {
  label: string;
  value: "all" | "active" | "disabled";
}[] = [
  { label: "全部", value: "all" },
  { label: "正常", value: "active" },
  { label: "禁用", value: "disabled" },
];

// 表单状态下拉选项
const STATUS_FORM_OPTIONS: { label: string; value: "active" | "disabled" }[] = [
  { label: "正常", value: "active" },
  { label: "禁用", value: "disabled" },
];

// 角色复选框选项
const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: "管理员", value: "admin" },
  { label: "普通用户", value: "user" },
];

export default function UserManagement() {
  const { message } = App.useApp();
  const canDelete = useAuthStore((s) => s.hasPermission("user:delete"));
  const [form] = Form.useForm<UserForm>();

  // 列表数据
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 搜索输入值（草稿）
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "disabled">("all");
  // 已提交的查询条件（点击搜索后才更新）
  const [query, setQuery] = useState<{
    keyword: string;
    status: "all" | "active" | "disabled";
  }>({
    keyword: "",
    status: "all",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal 状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 行内操作 loading
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 手动刷新触发器（CRUD 后调用 reload() 重新加载）
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  // 加载列表数据
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetchUsers({ ...query, page, pageSize });
        if (!active) return;
        setData(res.list);
        setTotal(res.total);
      } catch {
        if (active) message.error("加载用户列表失败");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [query, page, pageSize, reloadKey, message]);

  // Modal 打开时为表单赋值
  useEffect(() => {
    if (!modalOpen) return;
    if (editingUser) {
      form.setFieldsValue({
        username: editingUser.username,
        email: editingUser.email,
        password: "",
        roles: editingUser.roles,
        status: editingUser.status,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        username: "",
        email: "",
        password: "",
        roles: ["user"],
        status: "active",
      });
    }
  }, [modalOpen, editingUser, form]);

  // 点击搜索：提交查询条件并回到第一页
  const handleSearch = () => {
    setLoading(true);
    setQuery({ keyword, status });
    setPage(1);
  };

  // 重置搜索条件
  const handleReset = () => {
    setKeyword("");
    setStatus("all");
    setLoading(true);
    setQuery({ keyword: "", status: "all" });
    setPage(1);
  };

  // 打开新增 Modal
  const openCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  // 打开编辑 Modal
  const openEdit = (user: User) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  // 提交表单（新增 / 编辑）
  const handleSubmit = async () => {
    let values: UserForm;
    try {
      values = await form.validateFields();
    } catch {
      return; // 校验失败，表单自动展示错误
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        // 编辑：密码留空则不修改
        const patch: Partial<UserForm> = {
          email: values.email,
          roles: values.roles,
          status: values.status,
        };
        if (values.password) {
          patch.password = values.password;
        }
        await updateUser(editingUser.id, patch);
        message.success("用户更新成功");
      } else {
        await createUser(values);
        message.success("用户新增成功");
      }
      setModalOpen(false);
      reload();
    } catch {
      message.error(editingUser ? "更新失败" : "新增失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 启停切换
  const handleToggle = async (user: User) => {
    setTogglingId(user.id);
    try {
      const updated = await toggleUserStatus(user.id);
      if (updated) {
        message.success(updated.status === "active" ? "已启用" : "已禁用");
        reload();
      } else {
        message.error("操作失败，用户不存在");
      }
    } catch {
      message.error("操作失败");
    } finally {
      setTogglingId(null);
    }
  };

  // 删除用户
  const handleDelete = async (user: User) => {
    setDeletingId(user.id);
    try {
      const ok = await deleteUser(user.id);
      if (ok) {
        message.success("删除成功");
        // 当前页只剩一条且非首页时，回退一页
        if (data.length === 1 && page > 1) {
          setLoading(true);
          setPage(page - 1);
        } else {
          reload();
        }
      } else {
        message.error("删除失败，用户不存在");
      }
    } catch {
      message.error("删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  // 表格列定义
  const columns: TableProps<User>["columns"] = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar || undefined} size="small">
            {record.username.slice(0, 1).toUpperCase()}
          </Avatar>
          {record.username}
        </Space>
      ),
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "角色",
      dataIndex: "roles",
      key: "roles",
      render: (roles: Role[]) => (
        <>
          {roles.map((role) => (
            <Tag key={role} color={role === "admin" ? "purple" : "blue"}>
              {role === "admin" ? "管理员" : "普通用户"}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (s: "active" | "disabled") => (
        <Tag color={s === "active" ? "green" : "red"}>
          {s === "active" ? "正常" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "最后登录",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      render: (v?: string) => v || "-",
    },
    {
      title: "操作",
      key: "action",
      width: 220,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => void handleToggle(record)}
            loading={togglingId === record.id}
          >
            {record.status === "active" ? "禁用" : "启用"}
          </Button>
          {canDelete && (
            <Popconfirm
              title="确认删除"
              description={`确定要删除用户「${record.username}」吗？此操作不可恢复。`}
              okText="删除"
              cancelText="取消"
              okButtonProps={{
                danger: true,
                loading: deletingId === record.id,
              }}
              onConfirm={() => void handleDelete(record)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      {/* 搜索栏 + 工具栏 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Space wrap>
          <Input
            placeholder="搜索用户名 / 邮箱"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
          />
          <Select
            value={status}
            onChange={(v) => setStatus(v)}
            options={STATUS_OPTIONS}
            style={{ width: 120 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增用户
        </Button>
      </div>

      {/* 数据表格 */}
      <Table<User>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setLoading(true);
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      {/* 新增 / 编辑 Modal */}
      <Modal
        open={modalOpen}
        title={editingUser ? "编辑用户" : "新增用户"}
        onOk={() => void handleSubmit()}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="请输入用户名" readOnly={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: !editingUser, message: "请输入密码" }]}
          >
            <Input.Password
              placeholder={editingUser ? "留空则不修改" : "请输入密码"}
            />
          </Form.Item>

          <Form.Item
            name="roles"
            label="角色"
            rules={[{ required: true, message: "请至少选择一个角色" }]}
          >
            <Checkbox.Group options={ROLE_OPTIONS} />
          </Form.Item>

          <Form.Item name="status" label="状态">
            <Radio.Group
              options={STATUS_FORM_OPTIONS}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
