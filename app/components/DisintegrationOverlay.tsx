'use client';

import React, { useRef, useEffect } from 'react';

interface DisintegrationOverlayProps {
  isActive: boolean;
  themeColor: string; // Theme accent color (e.g., '#ef4444' for extintor)
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  decay: number;
}

export default function DisintegrationOverlay({
  isActive,
  themeColor,
  onComplete,
}: DisintegrationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get parent bounds
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Generate particles in a grid covering the card
    const particles: Particle[] = [];
    const stepX = 14; // spacing between particles horizontally
    const stepY = 14; // spacing between particles vertically

    // Colors to mix: 
    // - themeColor (40% weight)
    // - Slate/gray tones representing text/borders (30% weight)
    // - Light gray/white representing card background (30% weight)
    const colorChoices = [
      themeColor,
      themeColor,
      '#64748b', // Slate 500
      '#94a3b8', // Slate 400
      '#e2e8f0', // Slate 200
      '#ffffff', // White
      '#f8fafc', // Slate 50
    ];

    for (let x = 4; x < canvas.width - 4; x += stepX) {
      for (let y = 4; y < canvas.height - 4; y += stepY) {
        // Add slight randomness to initial position to avoid rigid lines
        const px = x + (Math.random() - 0.5) * 6;
        const py = y + (Math.random() - 0.5) * 6;

        // Pick random color
        const color = colorChoices[Math.floor(Math.random() * colorChoices.length)];

        // Speeds: drift upward and slightly to the right (Telegram style)
        particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.2) * 1.8, // positive is right
          vy: -(0.6 + Math.random() * 1.6), // negative is up
          size: 1.2 + Math.random() * 2.8,
          color,
          opacity: 1.0,
          // Fade out over ~0.8 to 1.2s
          decay: 0.012 + Math.random() * 0.016,
        });
      }
    }

    let frameCount = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.opacity <= 0) continue;

        alive = true;

        // Apply velocities with a bit of wind turbulence (sine oscillation)
        p.x += p.vx + Math.sin(p.y / 24 + frameCount / 10) * 0.15;
        p.y += p.vy;
        p.opacity -= p.decay;

        if (p.opacity > 0) {
          ctx.beginPath();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          // Draw round particles
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      frameCount++;

      if (alive) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    };

    // Begin animation loop
    animate();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, themeColor, onComplete]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-50 rounded-2xl"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}
