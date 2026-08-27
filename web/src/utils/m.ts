import { message } from "antd";
import emitter from "./eventEmittere";
import { useEffect } from "react";

// 放到组件内部
export function SomeComponent() {
  useEffect(() => {
    const handler = () => {
      message.info("不可用");
      setTimeout(() => {
        location.href = "/reception";
      }, 1000);
    };
    emitter.on("LOG", handler);

    // 组件销毁，解绑监听，防止重复执行、内存泄漏
    return () => {
      emitter.off("LOG", handler);
    };
  });
}

export function API() {
  useEffect(() => {
    emitter.on("API_HTTP_ERROR", (msg) => {
      console.error("接口HTTP异常：", msg);
      message.error(msg);
    });

    emitter.on("API_AUTH_EXPIRED", (msg) => {
      console.warn("鉴权过期：", msg);
      message.error(msg);
      setTimeout(() => {
        location.href = "/login";
      }, 1000);
    });

    emitter.on("API_AUTH_FORBIDDEN", (msg) => {
      console.warn("权限不足：", msg);
      message.error(msg);
    });

    emitter.on("API_BUSINESS_ERROR", (msg) => {
      console.warn("接口业务异常：", msg);
      message.error(msg);
    });

    emitter.on("ERROR", (msg) => {
      console.error(msg);
      message.error(msg);
    });
  });
}
