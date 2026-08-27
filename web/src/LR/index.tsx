// AuthLayout：SSO 登录/注册/找回密码共享壳（居中玻璃卡片 + 二次元渐变背景）
import { Outlet } from "react-router-dom";
import "./auth.css";

export function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-title">
          <h1>ACG Hub</h1>
          <p>统一登录 · 进入你的二次元世界</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
