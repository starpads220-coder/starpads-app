"use client";

import React, { useRef, useState, useCallback } from "react";

interface BorderGlowProps {
  children: React.ReactNode;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  className?: string;
}

type Edge = "top" | "right" | "bottom" | "left" | null;

export default function BorderGlow({
  children,
  edgeSensitivity = 30,
  glowColor = "40 80 80",
  backgroundColor = "transparent",
  borderRadius = 16,
  glowRadius = 40,
  glowIntensity = 1,
  animated = false,
  colors,
  className = "",
}: BorderGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeEdge, setActiveEdge] = useState<Edge>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    setMousePos({ x, y });
    setDimensions({ w, h });

    const distTop = y;
    const distRight = w - x;
    const distBottom = h - y;
    const distLeft = x;

    const minDist = Math.min(distTop, distRight, distBottom, distLeft);

    if (minDist > edgeSensitivity) {
      setActiveEdge(null);
      return;
    }

    if (minDist === distTop) setActiveEdge("top");
    else if (minDist === distRight) setActiveEdge("right");
    else if (minDist === distBottom) setActiveEdge("bottom");
    else if (minDist === distLeft) setActiveEdge("left");
  }, [edgeSensitivity]);

  const handleMouseLeave = useCallback(() => {
    setActiveEdge(null);
  }, []);

  const glowStyle = (): React.CSSProperties => {
    if (!activeEdge) return {};

    const color = colors?.[0] || `rgba(${glowColor}, ${glowIntensity})`;

    let gradient = "";
    const pos = activeEdge === "top" || activeEdge === "bottom" ? mousePos.x : mousePos.y;
    const size = activeEdge === "top" || activeEdge === "bottom" ? dimensions.w : dimensions.h;
    const pct = size > 0 ? (pos / size) * 100 : 50;

    switch (activeEdge) {
      case "top":
        gradient = `radial-gradient(${glowRadius * 1.5}px ${glowRadius}px at ${pct}% 0%, ${color}, transparent)`;
        break;
      case "bottom":
        gradient = `radial-gradient(${glowRadius * 1.5}px ${glowRadius}px at ${pct}% 100%, ${color}, transparent)`;
        break;
      case "left":
        gradient = `radial-gradient(${glowRadius}px ${glowRadius * 1.5}px at 0% ${pct}%, ${color}, transparent)`;
        break;
      case "right":
        gradient = `radial-gradient(${glowRadius}px ${glowRadius * 1.5}px at 100% ${pct}%, ${color}, transparent)`;
        break;
    }

    return {
      background: gradient,
      opacity: glowIntensity,
      transition: animated ? "all 0.3s ease" : "none",
    };
  };

  const multiColorStyle = (): React.CSSProperties => {
    if (!activeEdge || !colors || colors.length < 2) return {};

    const pos = activeEdge === "top" || activeEdge === "bottom" ? mousePos.x : mousePos.y;
    const size = activeEdge === "top" || activeEdge === "bottom" ? dimensions.w : dimensions.h;
    const pct = size > 0 ? (pos / size) * 100 : 50;

    const stops = colors.map((c, i) => {
      const offset = (i / (colors.length - 1)) * 100;
      return `${c} ${offset}%`;
    }).join(", ");

    let gradient = "";
    switch (activeEdge) {
      case "top":
        gradient = `linear-gradient(90deg, ${stops})`;
        break;
      case "bottom":
        gradient = `linear-gradient(90deg, ${stops})`;
        break;
      case "left":
        gradient = `linear-gradient(180deg, ${stops})`;
        break;
      case "right":
        gradient = `linear-gradient(180deg, ${stops})`;
        break;
    }

    return {
      background: gradient,
      maskImage: `radial-gradient(${glowRadius * 1.5}px ${glowRadius}px at ${
        activeEdge === "top" || activeEdge === "bottom" ? `${pct}%` : activeEdge === "left" ? "0%" : "100%"
      } ${
        activeEdge === "left" || activeEdge === "right" ? `${pct}%` : activeEdge === "top" ? "0%" : "100%"
      }, rgba(0,0,0,1), rgba(0,0,0,0))`,
      WebkitMaskImage: `radial-gradient(${glowRadius * 1.5}px ${glowRadius}px at ${
        activeEdge === "top" || activeEdge === "bottom" ? `${pct}%` : activeEdge === "left" ? "0%" : "100%"
      } ${
        activeEdge === "left" || activeEdge === "right" ? `${pct}%` : activeEdge === "top" ? "0%" : "100%"
      }, rgba(0,0,0,1), rgba(0,0,0,0))`,
      opacity: glowIntensity,
      transition: animated ? "all 0.3s ease" : "none",
    };
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{ borderRadius, backgroundColor, overflow: "hidden" }}
    >
      {colors && colors.length >= 2 ? (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={multiColorStyle()}
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={glowStyle()}
        />
      )}
      <div className="relative z-20">{children}</div>
    </div>
  );
}
