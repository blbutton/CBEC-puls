// 统一路由：createBrowserRouter，根布局为 App（ConfigProvider + Outlet + ScrollToTop）
import { createBrowserRouter } from "react-router-dom";
import App from "@/App";
import { routes } from "./routes";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: routes,
  },
]);

export default router;
