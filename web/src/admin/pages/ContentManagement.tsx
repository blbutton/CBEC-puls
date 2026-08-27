// 内容管理：列表 / 搜索 / 批量操作 / 新增编辑 Modal / 权限控制
import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  AutoComplete,
  Popconfirm,
  Radio,
  Typography,
  App,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/store/auth";
import {
  fetchContents,
  createContent,
  updateContent,
  deleteContent,
  publishContents,
  deleteContents,
  fetchCategories,
  type ContentForm,
} from "@/services/content";
import type { ContentItem, ContentStatus } from "@/types";
import { formatDate } from "@/utils/format";
import type { ContentQuery } from "@/types/api";

const { Title } = Typography;

// 生成默认表单值：新增时作者默认当前登录用户
const getDefaultForm = (author: string): ContentForm => ({
  title: "",
  category: "",
  author,
  excerpt: "",
  content: "",
  status: "draft",
});

export default function ContentManagement() {
  // 操作反馈：通过 antd App 上下文获取 message 实例
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  // 权限点
  const canCreate = hasPermission("content:create");
  const canEdit = hasPermission("content:edit");
  const canPublish = hasPermission("content:publish");
  const canDelete = hasPermission("content:delete");

  // 列表数据
  const [list, setList] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 搜索过滤条件
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<ContentStatus | "all">("all");

  // 分类下拉数据
  const [categories, setCategories] = useState<string[]>([]);

  // 行选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 新增 / 编辑 Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ContentForm>();

  // 手动刷新触发器（CRUD 后调用 reload() 重新加载）
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  // 拉取分类下拉
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        // 静默失败，不影响主流程
      });
  }, []);

  // 拉取内容列表
  useEffect(() => {
    let active = true;
    const load = async () => {
      const query: ContentQuery = {
        keyword: keyword.trim() || undefined,
        category,
        status,
        page,
        pageSize,
      };
      try {
        const res = await fetchContents(query);
        if (!active) return;
        setSelectedRowKeys([]);
        setList(res.list);
        setTotal(res.total);
      } catch {
        if (active) message.error("加载内容列表失败");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [keyword, category, status, page, pageSize, reloadKey, message]);

  // Modal 打开后填充表单（确保 Form 已挂载）
  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      form.setFieldsValue({
        title: editing.title,
        category: editing.category,
        author: editing.author,
        excerpt: editing.excerpt,
        content: editing.content,
        status: editing.status,
      });
    } else {
      form.resetFields();
      form.setFieldsValue(getDefaultForm(user?.username ?? ""));
    }
  }, [modalOpen, editing, form, user]);

  // 搜索
  const onSearch = () => {
    setPage(1);
    reload();
  };

  // 重置筛选条件
  const onReset = () => {
    setKeyword("");
    setCategory(undefined);
    setStatus("all");
    setLoading(true);
    setPage(1);
  };

  // 打开新增
  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  // 打开编辑
  const openEdit = (item: ContentItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  // 提交新增 / 编辑
  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        const updated = await updateContent(editing.id, values);
        if (updated) {
          message.success("更新成功");
        } else {
          message.warning("内容不存在或已被删除");
        }
      } else {
        await createContent(values);
        message.success("新增成功");
      }
      setModalOpen(false);
      reload();
    } catch {
      // 校验失败，Form 自动展示错误提示
    } finally {
      setSubmitting(false);
    }
  };

  // 单项发布 / 取消发布
  const onTogglePublish = async (item: ContentItem) => {
    try {
      if (item.status === "draft") {
        await updateContent(item.id, { status: "published" });
        message.success("发布成功");
      } else {
        await updateContent(item.id, { status: "draft" });
        message.success("已取消发布");
      }
      reload();
    } catch {
      message.error("操作失败");
    }
  };

  // 单项删除
  const onDelete = async (id: string) => {
    try {
      const ok = await deleteContent(id);
      if (ok) {
        message.success("删除成功");
        reload();
      } else {
        message.warning("内容不存在或已被删除");
      }
    } catch {
      message.error("删除失败");
    }
  };

  // 批量发布
  const onBatchPublish = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      const count = await publishContents(selectedRowKeys as string[]);
      message.success(`成功发布 ${count} 条内容`);
      reload();
    } catch {
      message.error("批量发布失败");
    }
  };

  // 批量删除
  const onBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      const count = await deleteContents(selectedRowKeys as string[]);
      message.success(`成功删除 ${count} 条内容`);
      reload();
    } catch {
      message.error("批量删除失败");
    }
  };

  // 表格列定义
  const columns: TableColumnsType<ContentItem> = [
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "作者",
      dataIndex: "author",
      key: "author",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (v: ContentStatus) =>
        v === "published" ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => formatDate(v, true),
    },
    {
      title: "发布时间",
      dataIndex: "publishedAt",
      key: "publishedAt",
      render: (v?: string) => (v ? formatDate(v, true) : "-"),
    },
    {
      title: "操作",
      key: "action",
      width: 220,
      render: (_, record) => (
        <Space size="small">
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            >
              编辑
            </Button>
          )}
          {canPublish && (
            <Button
              type="link"
              size="small"
              onClick={() => onTogglePublish(record)}
            >
              {record.status === "draft" ? "发布" : "取消发布"}
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title="确认删除该内容？"
              okText="删除"
              cancelText="取消"
              onConfirm={() => onDelete(record.id)}
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
    <div>
      <Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>
        内容管理
      </Title>

      {/* 搜索栏 */}
      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { paddingBottom: 16 } }}
      >
        <Space wrap>
          <Input
            placeholder="搜索标题 / 作者"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={onSearch}
            allowClear
            style={{ width: 220 }}
          />
          <Select
            placeholder="选择分类"
            value={category}
            onChange={(v) => setCategory(v)}
            allowClear
            style={{ width: 160 }}
            options={categories.map((c) => ({ label: c, value: c }))}
          />
          <Select
            placeholder="状态"
            value={status}
            onChange={(v) => setStatus(v as ContentStatus | "all")}
            style={{ width: 120 }}
            options={[
              { label: "全部", value: "all" },
              { label: "草稿", value: "draft" },
              { label: "已发布", value: "published" },
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={onReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 工具栏 + 表格 */}
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Space>
            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreate}
              >
                新增内容
              </Button>
            )}
            {selectedRowKeys.length > 0 && (
              <>
                <span style={{ color: "rgba(0,0,0,0.45)" }}>
                  已选 {selectedRowKeys.length} 项
                </span>
                {canPublish && (
                  <Button icon={<UploadOutlined />} onClick={onBatchPublish}>
                    批量发布
                  </Button>
                )}
                {canDelete && (
                  <Popconfirm
                    title={`确认删除选中的 ${selectedRowKeys.length} 条内容？`}
                    okText="删除"
                    cancelText="取消"
                    onConfirm={onBatchDelete}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      批量删除
                    </Button>
                  </Popconfirm>
                )}
              </>
            )}
          </Space>
        </div>

        <Table<ContentItem>
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setLoading(true);
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* 新增 / 编辑 Modal */}
      <Modal
        title={editing ? "编辑内容" : "新增内容"}
        open={modalOpen}
        onOk={onSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={680}
      >
        <Form<ContentForm>
          form={form}
          layout="vertical"
          initialValues={getDefaultForm(user?.username ?? "")}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: "请输入标题" }]}
          >
            <Input placeholder="请输入标题" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: "请选择或输入分类" }]}
          >
            <AutoComplete
              placeholder="选择或输入分类"
              options={categories.map((c) => ({ value: c }))}
              filterOption={(input, option) =>
                (option?.value ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="author"
            label="作者"
            rules={[{ required: true, message: "请输入作者" }]}
          >
            <Input placeholder="请输入作者" />
          </Form.Item>

          <Form.Item name="excerpt" label="摘要">
            <Input.TextArea
              rows={2}
              placeholder="请输入摘要"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item name="content" label="正文">
            <Input.TextArea rows={6} placeholder="请输入正文" />
          </Form.Item>

          <Form.Item name="status" label="状态">
            <Radio.Group
              options={[
                { label: "草稿", value: "draft" },
                { label: "已发布", value: "published" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
