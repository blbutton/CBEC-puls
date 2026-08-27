import { Spin } from "antd";

export default function FullSpin() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        width: "100%",
      }}
    >
      <Spin size="large" />
    </div>
  );
}
