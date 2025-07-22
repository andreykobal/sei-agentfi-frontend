// components/Bubbles.tsx
"use client";

import { useEffect, useRef } from "react";

const Bubbles: React.FC = () => {
  const interBubbleRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const lastMouseMoveRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);

  useEffect(() => {
    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;

    const move = () => {
      // Check if we should stop animating (no mouse movement for 100ms)
      if (Date.now() - lastMouseMoveRef.current > 100) {
        isAnimatingRef.current = false;
        return;
      }

      // Smoothly move toward the target position
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;

      if (interBubbleRef.current) {
        // Use transform3d for hardware acceleration
        interBubbleRef.current.style.transform = `translate3d(${Math.round(
          curX
        )}px, ${Math.round(curY)}px, 0)`;
      }

      animationRef.current = requestAnimationFrame(move);
    };

    // Throttle mouse movement events
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleMouseMove = (event: MouseEvent) => {
      if (throttleTimeout) return;

      throttleTimeout = setTimeout(() => {
        tgX = event.clientX;
        tgY = event.clientY;
        lastMouseMoveRef.current = Date.now();

        // Start animation if not already running
        if (!isAnimatingRef.current) {
          isAnimatingRef.current = true;
          move();
        }

        throttleTimeout = null;
      }, 16); // ~60fps throttling
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, []);

  return (
    <div className="gradient-bg">
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className="gradients-container">
        <div className="g1"></div>
        <div className="g2"></div>
        <div className="g3"></div>
        <div ref={interBubbleRef} className="interactive"></div>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        :root {
          --color-bg1: rgb(108, 0, 162);
          --color-bg2: rgb(0, 17, 82);
          --color1: 18, 113, 255;
          --color2: 221, 74, 255;
          --color3: 100, 220, 255;
          --color-interactive: 140, 100, 255;
          --circle-size: 70%;
          --blending: hard-light;
        }

        @keyframes moveInCircle {
          0% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(180deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes moveVertical {
          0% {
            transform: translateY(-30%);
          }
          50% {
            transform: translateY(30%);
          }
          100% {
            transform: translateY(-30%);
          }
        }

        .gradient-bg {
          width: 100vw;
          height: 100vh;
          position: fixed;
          overflow: hidden;
          background: linear-gradient(
            40deg,
            var(--color-bg1),
            var(--color-bg2)
          );
          top: 0;
          left: 0;
          z-index: -1;
        }

        .gradient-bg svg {
          position: fixed;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
        }

        .gradient-bg .gradients-container {
          filter: url(#goo) blur(20px);
          width: 100%;
          height: 100%;
          will-change: filter;
        }

        .gradient-bg .g1 {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color1), 0.8) 0,
              rgba(var(--color1), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size);
          height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2);
          left: calc(50% - var(--circle-size) / 2);
          transform-origin: center center;
          animation: moveVertical 60s ease infinite;
          opacity: 1;
          will-change: transform;
        }

        .gradient-bg .g2 {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color2), 0.8) 0,
              rgba(var(--color2), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size);
          height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2);
          left: calc(50% - var(--circle-size) / 2);
          transform-origin: calc(50% - 400px);
          animation: moveInCircle 40s reverse infinite;
          opacity: 1;
          will-change: transform;
        }

        .gradient-bg .g3 {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color3), 0.8) 0,
              rgba(var(--color3), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: var(--circle-size);
          height: var(--circle-size);
          top: calc(50% - var(--circle-size) / 2 + 200px);
          left: calc(50% - var(--circle-size) / 2 - 500px);
          transform-origin: calc(50% + 400px);
          animation: moveInCircle 80s linear infinite;
          opacity: 1;
          will-change: transform;
        }

        .gradient-bg .interactive {
          position: absolute;
          background: radial-gradient(
              circle at center,
              rgba(var(--color-interactive), 0.8) 0,
              rgba(var(--color-interactive), 0) 50%
            )
            no-repeat;
          mix-blend-mode: var(--blending);
          width: 100%;
          height: 100%;
          top: -50%;
          left: -50%;
          opacity: 0.7;
          will-change: transform;
        }
      `}</style>
    </div>
  );
};

export default Bubbles;
