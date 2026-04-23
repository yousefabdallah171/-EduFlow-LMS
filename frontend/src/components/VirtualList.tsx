import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type VirtualListProps<TItem> = {
  items: TItem[];
  estimateItemHeight: number;
  overscan?: number;
  className?: string;
  style?: CSSProperties;
  renderItem: (item: TItem, index: number) => ReactNode;
  getKey?: (item: TItem, index: number) => string | number;
};

export const VirtualList = <TItem,>({
  items,
  estimateItemHeight,
  overscan = 6,
  className,
  style,
  renderItem,
  getKey
}: VirtualListProps<TItem>) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const totalHeight = items.length * estimateItemHeight;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const update = () => setContainerHeight(node.clientHeight);
    update();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(update);
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const range = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / estimateItemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / estimateItemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [containerHeight, estimateItemHeight, items.length, overscan, scrollTop]);

  const visible = useMemo(
    () => items.slice(range.startIndex, range.endIndex + 1).map((item, idx) => ({ item, index: range.startIndex + idx })),
    [items, range.endIndex, range.startIndex]
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={style}
      onScroll={(event) => setScrollTop((event.target as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visible.map(({ item, index }) => (
          <div
            key={getKey ? getKey(item, index) : index}
            style={{
              position: "absolute",
              top: index * estimateItemHeight,
              left: 0,
              right: 0,
              height: estimateItemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
};
