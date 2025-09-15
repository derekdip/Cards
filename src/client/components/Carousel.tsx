import React, { useEffect, useRef, useState } from "react";

const LeftArrow = () => (
  <svg style={{ width: 32, height: 40 }} viewBox="0 0 24 24">
    <path d="M15 6l-6 6 6 6" stroke="grey" strokeWidth="2" fill="none" />
  </svg>
);

const RightArrow = () => (
  <svg style={{ width: 32, height: 40 }} viewBox="0 0 24 24">
    <path d="M9 6l6 6-6 6" stroke="grey" strokeWidth="2" fill="none" />
  </svg>
);

interface CarouselParams {
  children: React.ReactNode[];
  snapToInterval: number;
  height?: number | string;
  onIndexChange?: (index: number) => void;
  startingIndex?: number;
  scrollEnabled?: boolean;
}

export function Carousel({
  children,
  snapToInterval,
  onIndexChange,
  startingIndex = 0,
  height = 200,
  scrollEnabled = true,
}: CarouselParams) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentIndex = useRef(startingIndex);
  const [scrollReady, setScrollReady] = useState(false);
  const totalItems = React.Children.count(children);

  const handleScrollEnd = () => {
    if (!scrollRef.current) return;
    const offset = scrollRef.current.scrollLeft;
    const index = Math.round(offset / snapToInterval);
    currentIndex.current = index;
    if (onIndexChange) onIndexChange(index);
  };

  const scrollToIndex = (index: number) => {
    if (scrollRef.current) {
      const offset = index * snapToInterval;
      scrollRef.current.scrollTo({ left: offset, behavior: "smooth" });
      currentIndex.current = index;
    }
  };

  useEffect(() => {
    if (!scrollReady && scrollRef.current) {
      scrollToIndex(startingIndex);
      setScrollReady(true);
    }
  }, [scrollReady, startingIndex]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      {/* Left arrow */}
      <div
        onClick={() => {
          if (currentIndex.current > 0) {
            scrollToIndex(currentIndex.current - 1);
          }
        }}
        style={{ cursor: "pointer" }}
      >
        <LeftArrow />
      </div>

      {/* Scroll container */}
      <div
        style={{
          width: snapToInterval,
          height,
          overflowX: scrollEnabled ? "auto" : "hidden",
          scrollSnapType: "x mandatory",
          display: "flex",
          position: "relative",
        }}
        ref={scrollRef}
        onScroll={() => {
          clearTimeout((scrollRef.current as any)?._scrollTimer);
          (scrollRef.current as any)._scrollTimer = setTimeout(
            handleScrollEnd,
            150
          );
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            scrollSnapAlign: "center",
          }}
        >
          {children.map((child, i) => (
            <div
              key={i}
              style={{
                width: snapToInterval,
                height: "100%",
                flexShrink: 0,
                scrollSnapAlign: "center",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Right arrow */}
      <div
        onClick={() => {
          if (currentIndex.current < totalItems - 1) {
            scrollToIndex(currentIndex.current + 1);
          }
        }}
        style={{ cursor: "pointer" }}
      >
        <RightArrow />
      </div>
    </div>
  );
}
