"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "./providers/ThemeProvider";

interface Particle {
  x: number;
  y: number;
  r: number;
  d: number; // Density
  speedX: number;
  speedY: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  type: "sakura" | "snow";
}

export default function CanvasEffects() {
  const { settings } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const particleCountRef = useRef<number>(settings.density);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const isSakura = settings.sakuraEnabled;
    const isSnow = settings.snowEnabled;

    // Disable if reduced motion is enabled
    const isDisabled = settings.reducedMotion || (!isSakura && !isSnow);

    if (isDisabled) {
      ctx.clearRect(0, 0, width, height);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return () => window.removeEventListener("resize", handleResize);
    }

    let particles: Particle[] = [];

    const createParticle = (isInit = false): Particle => {
      let type: "sakura" | "snow" = "snow";
      if (isSakura && isSnow) {
        type = Math.random() > 0.45 ? "sakura" : "snow";
      } else if (isSakura) {
        type = "sakura";
      }

      const isSakuraPart = type === "sakura";
      // min size: font size (approx 12px), max size: 3x (approx 36px)
      const size = Math.random() * 24 + 12;
      
      // Wind speed drift must be natural, not pixelated or wavy
      const speedX = Math.random() * 0.8 - 0.2 + (isSakuraPart ? 0.3 : 0);
      const speedY = Math.random() * 1.2 + (isSakuraPart ? 1.0 : 0.8);
      
      return {
        x: Math.random() * width,
        y: isInit ? Math.random() * height : -30, // spawn cleanly above viewport
        r: size,
        d: Math.random() * 5 + 1,
        speedX,
        speedY,
        opacity: Math.random() * 0.5 + 0.35,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 1.2,
        type,
      };
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(particleCountRef.current, 150);
      for (let i = 0; i < count; i++) {
        particles.push(createParticle(true));
      }
    };

    initParticles();

    // Frame rates calculation
    let frames = 0;
    let lastFpsUpdateTime = performance.now();

    const animate = (timestamp: number) => {
      if (document.hidden) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      // Calculate FPS
      frames++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (now - lastFpsUpdateTime >= 1000) {
        fpsRef.current = Math.round((frames * 1000) / (now - lastFpsUpdateTime));
        frames = 0;
        lastFpsUpdateTime = now;

        // Auto adjust density if performance is slow (FPS < 40)
        if (fpsRef.current < 40 && particleCountRef.current > 15) {
          particleCountRef.current = Math.max(15, Math.floor(particleCountRef.current * 0.8));
          initParticles();
        }
      }

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p, idx) => {
        // Update physics
        p.y += p.speedY * settings.speed;
        p.x += p.speedX * settings.speed;
        p.rotation += p.rotationSpeed * settings.speed;

        // Render
        // Particle custom render using canvas path drawing
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        // Pick one of the 5 distinct shape variations based on seed hash of the particle size
        const shapeSeed = Math.floor(p.r * 100) % 5;

        if (p.type === "sakura") {
          ctx.fillStyle = "#FFB7C5"; // Soft pink
          ctx.strokeStyle = "#FF69B4"; // Deep pink outline
          ctx.lineWidth = 1;

          ctx.beginPath();
          if (shapeSeed === 0) {
            // Standard cherry blossom petal with a notch at the tip
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-p.r / 2, -p.r * 0.8, -p.r, -p.r * 0.4, -p.r * 0.8, p.r * 0.3);
            ctx.bezierCurveTo(-p.r * 0.6, p.r * 0.8, -p.r * 0.2, p.r, 0, p.r * 0.8);
            ctx.bezierCurveTo(p.r * 0.2, p.r, p.r * 0.6, p.r * 0.8, p.r * 0.8, p.r * 0.3);
            ctx.bezierCurveTo(p.r, -p.r * 0.4, p.r / 2, -p.r * 0.8, 0, 0);
          } else if (shapeSeed === 1) {
            // Heart shaped petal
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-p.r, -p.r / 2, -p.r, p.r / 2, 0, p.r);
            ctx.bezierCurveTo(p.r, p.r / 2, p.r, -p.r / 2, 0, 0);
          } else if (shapeSeed === 2) {
            // Slightly curled/folded petal
            ctx.ellipse(0, 0, p.r, p.r / 2, 0, 0, 2 * Math.PI);
          } else if (shapeSeed === 3) {
            // Double-lobed petal
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-p.r * 0.8, -p.r * 0.5, -p.r * 0.3, p.r * 0.8);
            ctx.quadraticCurveTo(p.r * 0.8, -p.r * 0.5, 0, 0);
          } else {
            // Elongated narrow wind petal
            ctx.ellipse(0, 0, p.r * 1.2, p.r / 3, Math.PI / 6, 0, 2 * Math.PI);
          }
          ctx.fill();
          ctx.stroke();
        } else {
          // Detailed vector snowflake crystal variants
          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
          ctx.lineWidth = Math.max(1, p.r / 6);
          ctx.beginPath();
          
          if (shapeSeed === 0) {
            // 6-arm classic star snowflake
            for (let i = 0; i < 6; i++) {
              ctx.rotate(Math.PI / 3);
              ctx.moveTo(0, 0);
              ctx.lineTo(0, p.r);
              // Mini branches
              ctx.moveTo(0, p.r * 0.5);
              ctx.lineTo(-p.r * 0.25, p.r * 0.7);
              ctx.moveTo(0, p.r * 0.5);
              ctx.lineTo(p.r * 0.25, p.r * 0.7);
            }
          } else if (shapeSeed === 1) {
            // Hexagonal plate snowflake
            for (let i = 0; i < 6; i++) {
              ctx.rotate(Math.PI / 3);
              ctx.lineTo(0, p.r);
            }
            ctx.closePath();
          } else if (shapeSeed === 2) {
            // Crystal diamond snowflake
            for (let i = 0; i < 6; i++) {
              ctx.rotate(Math.PI / 3);
              ctx.moveTo(0, 0);
              ctx.lineTo(0, p.r);
              ctx.moveTo(-p.r * 0.15, p.r * 0.4);
              ctx.lineTo(0, p.r * 0.6);
              ctx.lineTo(p.r * 0.15, p.r * 0.4);
            }
          } else if (shapeSeed === 3) {
            // Simple cross flake
            for (let i = 0; i < 4; i++) {
              ctx.rotate(Math.PI / 2);
              ctx.moveTo(0, 0);
              ctx.lineTo(0, p.r);
            }
          } else {
            // Stellar dendrite flake
            for (let i = 0; i < 6; i++) {
              ctx.rotate(Math.PI / 3);
              ctx.moveTo(0, 0);
              ctx.lineTo(0, p.r);
              ctx.moveTo(0, p.r * 0.4);
              ctx.lineTo(-p.r * 0.2, p.r * 0.5);
              ctx.moveTo(0, p.r * 0.4);
              ctx.lineTo(p.r * 0.2, p.r * 0.5);
              ctx.moveTo(0, p.r * 0.75);
              ctx.lineTo(-p.r * 0.15, p.r * 0.85);
              ctx.moveTo(0, p.r * 0.75);
              ctx.lineTo(p.r * 0.15, p.r * 0.85);
            }
          }
          ctx.stroke();
        }

        ctx.restore();

        // Reset if offscreen
        if (p.y > height + 20 || p.x > width + 20 || p.x < -20) {
          particles[idx] = createParticle(false);
        }
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [settings.background, settings.sakuraEnabled, settings.snowEnabled, settings.density, settings.speed, settings.reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10 block"
      style={{ mixBlendMode: "normal" }}
    />
  );
}
