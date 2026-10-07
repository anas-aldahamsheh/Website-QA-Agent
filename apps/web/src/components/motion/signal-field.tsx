'use client';

import { useEffect, useRef } from 'react';

// The page backdrop: a field of grid points that behaves like a scanner bed. A beam sweeps down the
// screen and lights the points it passes, the pointer bends the grid like a lens, and small packets
// travel along the lines. It is drawn on one canvas, pauses when the tab is hidden, and stays still
// for visitors who ask for reduced motion.
export function SignalField({ intensity = 1 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gap = 30;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    let packets: { x: number; y: number; dx: number; dy: number; life: number }[] = [];
    let colors = readColors();

    function readColors() {
      const style = getComputedStyle(document.documentElement);
      return {
        dot: `hsl(${style.getPropertyValue('--grid-line').trim()}`,
        glow: `hsl(${style.getPropertyValue('--primary').trim()}`,
        accent: `hsl(${style.getPropertyValue('--accent').trim()}`,
        light: document.documentElement.classList.contains('light')
      };
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnPacket = () => {
      const horizontal = Math.random() > 0.5;
      const cols = Math.ceil(width / gap);
      const rows = Math.ceil(height / gap);
      packets.push(horizontal
        ? { x: Math.random() > 0.5 ? 0 : width, y: Math.floor(Math.random() * rows) * gap, dx: 0, dy: 0, life: 1 }
        : { x: Math.floor(Math.random() * cols) * gap, y: 0, dx: 0, dy: 0, life: 1 });
      const packet = packets[packets.length - 1]!;
      const speed = 1.6 + Math.random() * 2.2;
      if (horizontal) packet.dx = packet.x === 0 ? speed : -speed;
      else packet.dy = speed;
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;

      const cycle = 9000;
      const beamY = ((time % cycle) / cycle) * (height + 400) - 200;
      const baseAlpha = (colors.light ? 0.16 : 0.11) * intensity;

      for (let y = gap / 2; y < height; y += gap) {
        const beamDistance = Math.abs(y - beamY);
        const beam = beamDistance < 160 ? 1 - beamDistance / 160 : 0;
        for (let x = gap / 2; x < width; x += gap) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const lens = dist < 220 ? 1 - dist / 220 : 0;
          const push = lens * lens * 14;
          const px = x + (dist > 0 ? (dx / dist) * push : 0);
          const py = y + (dist > 0 ? (dy / dist) * push : 0);
          const wave = Math.sin(x * 0.012 + time * 0.0006) * Math.cos(y * 0.014 - time * 0.0005);
          const alpha = baseAlpha + wave * 0.03 * intensity + beam * beam * 0.45 * intensity + lens * 0.35 * intensity;
          if (alpha <= 0.02) continue;
          context.globalAlpha = Math.min(alpha, 0.9);
          context.fillStyle = beam > 0.35 || lens > 0.4 ? colors.glow : colors.dot;
          const size = 1 + beam * 1.1 + lens * 1.2;
          context.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }

      // The beam itself: a thin bright line with a soft trailing wash.
      const gradient = context.createLinearGradient(0, beamY - 140, 0, beamY + 2);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, colors.glow);
      context.globalAlpha = 0.05 * intensity;
      context.fillStyle = gradient;
      context.fillRect(0, beamY - 140, width, 142);
      context.globalAlpha = 0.28 * intensity;
      context.fillRect(0, beamY, width, 1);

      if (Math.random() < 0.035 && packets.length < 7) spawnPacket();
      packets = packets.filter((packet) => packet.x >= -40 && packet.x <= width + 40 && packet.y <= height + 40);
      for (const packet of packets) {
        packet.x += packet.dx;
        packet.y += packet.dy;
        const tail = context.createLinearGradient(packet.x - packet.dx * 26, packet.y - packet.dy * 26, packet.x, packet.y);
        tail.addColorStop(0, 'transparent');
        tail.addColorStop(1, colors.accent);
        context.globalAlpha = 0.55 * intensity;
        context.strokeStyle = tail;
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(packet.x - packet.dx * 26, packet.y - packet.dy * 26);
        context.lineTo(packet.x, packet.y);
        context.stroke();
      }
      context.globalAlpha = 1;
    };

    const loop = (time: number) => {
      if (!running) return;
      draw(time);
      frame = requestAnimationFrame(loop);
    };

    const onMove = (event: PointerEvent) => {
      pointer.tx = event.clientX;
      pointer.ty = event.clientY;
    };
    const onLeave = () => {
      pointer.tx = -9999;
      pointer.ty = -9999;
    };
    const onVisibility = () => {
      running = !document.hidden && !reduce;
      cancelAnimationFrame(frame);
      if (running) frame = requestAnimationFrame(loop);
    };
    const themeObserver = new MutationObserver(() => {
      colors = readColors();
      if (reduce) draw(2000);
    });

    resize();
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    if (reduce) {
      running = false;
      draw(2000);
    } else {
      frame = requestAnimationFrame(loop);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intensity]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-10%,hsl(var(--primary)/0.10),transparent_60%),radial-gradient(ellipse_60%_50%_at_0%_100%,hsl(var(--accent)/0.07),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(var(--background))_100%)]" />
    </div>
  );
}
