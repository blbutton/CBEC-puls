// React.lazy + Suspense 统一封装，fallback 为 AntD Spin 全屏加载
import { lazy, Suspense, type ComponentType } from "react";
import FullSpin from "./FullSpin";

export function lazyLoad<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  const LazyComp = lazy(factory);
  return function LazyRoute(props: P) {
    return (
      <Suspense fallback={<FullSpin />}>
        <LazyComp {...props} />
      </Suspense>
    );
  };
}
