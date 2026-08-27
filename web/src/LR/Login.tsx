// 登录页：AntD Form + authStore.login，成功后回跳来源或 /admin
import { useState } from "react";
import { Form, Input, Button, Checkbox, message } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

interface FromState {
  from?: Location;
}

interface LoginForm {
  username: string;
  password: string;
  remember: boolean;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as FromState | null)?.from?.pathname ?? "/admin";

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    const res = await login(values.username, values.password, values.remember);
    setLoading(false);
    if (res.success) {
      message.success(res.message);
      navigate(from, { replace: true });
    } else {
      message.error(res.message);
    }
  };

  return (
    <Form
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ remember: true }}
      requiredMark={false}
    >
      <Form.Item
        name="username"
        rules={[{ required: true, message: "请输入用户名" }]}
      >
        <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: "请输入密码" }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="密码"
          size="large"
        />
      </Form.Item>
      <Form.Item name="remember" valuePropName="checked" noStyle>
        <Checkbox>记住我</Checkbox>
      </Form.Item>
      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        block
        size="large"
        style={{ marginTop: 16 }}
      >
        登录
      </Button>
      <div className="auth-footer">
        <Link to="/register">注册账号</Link>
        <Link to="/forgot-password">忘记密码</Link>
      </div>
      <div className="auth-hint">
        演示账号：admin / 123456（管理员）、user / 123456（普通用户）
      </div>
    </Form>
  );
}
