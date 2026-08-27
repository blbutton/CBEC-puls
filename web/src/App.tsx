// 根布局壳：AntD ConfigProvider（中文/主题）+ 全局 App 上下文 + ScrollToTop + Outlet
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { API } from "./utils/m";

/** 路由切换时滚动到顶部 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}


export default function App() {
  API()
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{ token: { colorPrimary: "#7a6bff", borderRadius: 8 } }}
    >
      <AntdApp>
        <ScrollToTop />
        <Outlet />
      </AntdApp>
    </ConfigProvider>
  );
}
