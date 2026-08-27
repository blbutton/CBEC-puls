// 注册页：完整表单 + 校验 + 注册后自动跳转登录
import { useState } from "react";
import {
  Form,
  Input,
  Button,
  Checkbox,
  message,
  Progress,
  Tooltip,
} from "antd";
import {
  LockOutlined,
  UserOutlined,
  MailOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import type { RegisterForm } from "@/services/auth";

interface RegisterFormData extends RegisterForm {
  confirmPassword: string;
  agree: boolean;
}

/** 密码强度评估：0-4 → 弱/一般/中等/强/很强 */
function evaluatePassword(pwd: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = [
    { label: "极弱", color: "#ff4d4f" },
    { label: "较弱", color: "#ff7a45" },
    { label: "一般", color: "#faad14" },
    { label: "较强", color: "#52c41a" },
    { label: "很强", color: "#1677ff" },
  ];
  const idx = Math.min(score, 4);
  return {
    score: (idx + 1) * 20,
    label: levels[idx].label,
    color: levels[idx].color,
  };
}

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [pwdValue, setPwdValue] = useState("");
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormData>();

  const pwdInfo = evaluatePassword(pwdValue);

  const onFinish = async (values: RegisterFormData) => {
    if (values.password !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    const res = await register({
      username: values.username,
      email: values.email,
      password: values.password,
    });
    setLoading(false);
    if (res.success) {
      message.success(`${res.message}，即将跳转登录页`);
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } else {
      message.error(res.message);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ agree: true }}
      requiredMark={false}
    >
      <Form.Item
        name="username"
        label="用户名"
        rules={[
          { required: true, message: "请输入用户名" },
          { min: 3, max: 20, message: "用户名长度为 3-20 个字符" },
          { pattern: /^[A-Za-z0-9_]+$/, message: "仅支持字母、数字和下划线" },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="3-20 位字母/数字/下划线"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: "请输入邮箱" },
          { type: "email", message: "请输入有效的邮箱地址" },
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="you@example.com"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        rules={[
          { required: true, message: "请输入密码" },
          { min: 6, max: 32, message: "密码长度为 6-32 位" },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="至少 6 位，建议字母+数字+符号"
          size="large"
          onChange={(e) => setPwdValue(e.target.value)}
        />
      </Form.Item>

      {pwdValue && (
        <div style={{ marginTop: -12, marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 12, color: "#8a8aa3" }}>密码强度</span>
            <span
              style={{ fontSize: 12, color: pwdInfo.color, fontWeight: 600 }}
            >
              {pwdInfo.label}
            </span>
          </div>
          <Progress
            percent={pwdInfo.score}
            showInfo={false}
            strokeColor={pwdInfo.color}
            size="small"
          />
        </div>
      )}

      <Form.Item
        name="confirmPassword"
        label="确认密码"
        dependencies={["password"]}
        rules={[
          { required: true, message: "请再次输入密码" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("两次输入的密码不一致"));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<SafetyOutlined />}
          placeholder="请再次输入密码"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="agree"
        valuePropName="checked"
        rules={[
          {
            validator: (_, v) =>
              v
                ? Promise.resolve()
                : Promise.reject(new Error("请先阅读并同意用户协议")),
          },
        ]}
      >
        <Checkbox>
          我已阅读并同意
          <Tooltip title="演示环境，用户协议暂未提供具体内容">
            <a
              href="#/"
              onClick={(e) => e.preventDefault()}
              style={{ margin: "0 4px" }}
            >
              《用户协议》
            </a>
          </Tooltip>
          和
          <Tooltip title="演示环境，隐私政策暂未提供具体内容">
            <a
              href="#/"
              onClick={(e) => e.preventDefault()}
              style={{ margin: "0 4px" }}
            >
              《隐私政策》
            </a>
          </Tooltip>
        </Checkbox>
      </Form.Item>

      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        block
        size="large"
        style={{ marginTop: 8 }}
      >
        注册账号
      </Button>

      <div className="auth-footer">
        <span>已有账号？</span>
        <Link to="/login">立即登录</Link>
        <Link to="/forgot-password" style={{ marginLeft: 12 }}>
          忘记密码
        </Link>
      </div>
    </Form>
  );
}
