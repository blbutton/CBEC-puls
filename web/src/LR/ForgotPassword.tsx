// 找回密码页：三步流程（邮箱→验证码→重置）
import { useEffect, useState } from "react";
import { Form, Input, Button, Steps, message, Result, Progress } from "antd";
import {
  MailOutlined,
  SafetyOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

type Step = 0 | 1 | 2 | 3; // 3 = 成功页

interface Step1Form {
  email: string;
}

interface Step2Form {
  code: string;
}

interface Step3Form {
  password: string;
  confirmPassword: string;
}

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

export default function ForgotPassword() {
  const [current, setCurrent] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState("");
  const [pwdValue, setPwdValue] = useState("");
  const sendVerifyCode = useAuthStore((s) => s.sendVerifyCode);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const navigate = useNavigate();
  const [form1] = Form.useForm<Step1Form>();
  const [form2] = Form.useForm<Step2Form>();
  const [form3] = Form.useForm<Step3Form>();

  const pwdInfo = evaluatePassword(pwdValue);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    try {
      await form1.validateFields(["email"]);
    } catch {
      return;
    }
    const emailValue = form1.getFieldValue("email");
    setCodeLoading(true);
    const res = await sendVerifyCode(emailValue);
    setCodeLoading(false);
    if (res.success) {
      message.success(res.message);
      setEmail(emailValue);
      setCountdown(60);
    } else {
      message.error(res.message);
    }
  };

  const onStep1Finish = async () => {
    // 发送验证码后直接进入下一步
    if (!email) {
      message.info("请先点击「获取验证码」按钮");
      return;
    }
    setCurrent(1);
  };

  const onStep2Finish = async (values: Step2Form) => {
    setLoading(true);
    // 这里只校验格式，真正的验证码校验在最后一步提交时统一进行
    await new Promise((r) => setTimeout(r, 300));
    setLoading(false);
    if (values.code.length !== 4) {
      message.error("请输入 4 位验证码");
      return;
    }
    setCurrent(2);
  };

  const onStep3Finish = async (values: Step3Form) => {
    if (values.password !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }
    const code = form2.getFieldValue("code");
    setLoading(true);
    const res = await resetPassword(email, code, values.password);
    setLoading(false);
    if (res.success) {
      message.success(res.message);
      setCurrent(3);
    } else {
      message.error(res.message);
      // 验证码错误 → 回到第二步
      if (res.message.includes("验证码")) {
        setCurrent(1);
        form2.setFieldsValue({ code: "" });
      }
    }
  };

  const handleBack = () => {
    if (current === 3) {
      navigate("/login", { replace: true });
    } else if (current > 0) {
      setCurrent((current - 1) as Step);
    }
  };

  const handleReset = () => {
    setCurrent(0);
    setEmail("");
    setPwdValue("");
    form1.resetFields();
    form2.resetFields();
    form3.resetFields();
  };

  return (
    <div>
      {current < 3 ? (
        <>
          <Steps
            size="small"
            current={current}
            items={[
              { title: "验证邮箱" },
              { title: "输入验证码" },
              { title: "重置密码" },
            ]}
            style={{ marginBottom: 24 }}
          />

          {current === 0 && (
            <Form
              form={form1}
              layout="vertical"
              onFinish={onStep1Finish}
              requiredMark={false}
            >
              <Form.Item
                name="email"
                label="注册邮箱"
                rules={[
                  { required: true, message: "请输入注册邮箱" },
                  { type: "email", message: "请输入有效的邮箱地址" },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="请输入注册时使用的邮箱"
                  size="large"
                />
              </Form.Item>
              <Form.Item label="验证码">
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    type="default"
                    size="large"
                    block
                    icon={
                      codeLoading ? <ReloadOutlined spin /> : <SafetyOutlined />
                    }
                    loading={codeLoading}
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                  >
                    {countdown > 0
                      ? `${countdown} 秒后重试`
                      : email
                        ? "重新发送验证码"
                        : "获取验证码"}
                  </Button>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#7a6db5",
                    background: "rgba(255,255,255,0.6)",
                    borderRadius: 8,
                    padding: "8px 12px",
                  }}
                >
                  Mock 演示：固定验证码为 <strong>1234</strong>
                  ，无需真实邮箱即可体验
                </div>
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                disabled={!email}
              >
                下一步
              </Button>
            </Form>
          )}

          {current === 1 && (
            <Form
              form={form2}
              layout="vertical"
              onFinish={onStep2Finish}
              requiredMark={false}
              initialValues={{ code: "" }}
            >
              <div style={{ marginBottom: 16, fontSize: 13, color: "#5a5a7a" }}>
                验证码已发送至邮箱 <strong>{email}</strong>
                <Button
                  type="link"
                  size="small"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  style={{ padding: 0, marginLeft: 8 }}
                >
                  {countdown > 0 ? `${countdown}s 后重发` : "重新发送"}
                </Button>
              </div>
              <Form.Item
                name="code"
                label="邮箱验证码"
                rules={[{ required: true, message: "请输入验证码" }]}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="请输入 4 位验证码"
                  size="large"
                  maxLength={4}
                  style={{
                    letterSpacing: 8,
                    textAlign: "center",
                    fontSize: 18,
                  }}
                />
              </Form.Item>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBack}
                >
                  上一步
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                >
                  下一步
                </Button>
              </div>
            </Form>
          )}

          {current === 2 && (
            <Form
              form={form3}
              layout="vertical"
              onFinish={onStep3Finish}
              requiredMark={false}
            >
              <Form.Item
                name="password"
                label="新密码"
                rules={[
                  { required: true, message: "请输入新密码" },
                  { min: 6, max: 32, message: "密码长度为 6-32 位" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入新密码"
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
                    <span style={{ fontSize: 12, color: "#8a8aa3" }}>
                      密码强度
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: pwdInfo.color,
                        fontWeight: 600,
                      }}
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
                label="确认新密码"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "请再次输入新密码" },
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
                  placeholder="请再次输入新密码"
                  size="large"
                />
              </Form.Item>

              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBack}
                >
                  上一步
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                >
                  确认重置
                </Button>
              </div>
            </Form>
          )}

          <div className="auth-footer">
            <Link to="/login">返回登录</Link>
            <Link to="/register" style={{ marginLeft: 12 }}>
              注册账号
            </Link>
          </div>
        </>
      ) : (
        <>
          <Result
            status="success"
            title="密码重置成功"
            subTitle="请使用新密码登录你的账号"
            extra={[
              <Button
                type="primary"
                key="login"
                size="large"
                onClick={() => navigate("/login", { replace: true })}
              >
                立即登录
              </Button>,
              <Button key="reset" size="large" onClick={handleReset}>
                再试一次
              </Button>,
            ]}
          />
        </>
      )}
    </div>
  );
}
