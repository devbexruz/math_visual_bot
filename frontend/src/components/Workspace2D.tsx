import React, { useRef, useEffect, useCallback } from 'react';

// --- 2D Shape Types ---
export interface Dot2DParams {
  x: number;
  y: number;
  color: string;
  title?: string;
}

export type Dot2DData = {
  id: string;
  type: 'dot2d';
  params: Dot2DParams;
};

export interface Line2DParams {
  k: number;
  b: number;
  color: string;
  title?: string;
}

export type Line2DData = {
  id: string;
  type: 'line2d';
  params: Line2DParams;
};

export interface Ellips2DParams {
  a: number;
  b: number;
  cx: number;
  cy: number;
  color: string;
  title?: string;
}

export type Ellips2DData = {
  id: string;
  type: 'ellips2d';
  params: Ellips2DParams;
};

export interface Parabola2DParams {
  a: number;
  b: number;
  c: number;
  color: string;
  title?: string;
}

export type Parabola2DData = {
  id: string;
  type: 'parabola2d';
  params: Parabola2DParams;
};

export interface Hyperbola2DParams {
  k: number;
  b: number;
  c: number;
  color: string;
  title?: string;
}

export type Hyperbola2DData = {
  id: string;
  type: 'hyperbola2d';
  params: Hyperbola2DParams;
};

export type Shape2DData = Dot2DData | Line2DData | Ellips2DData | Parabola2DData | Hyperbola2DData;

interface Workspace2DProps {
  shapes: Shape2DData[];
  onShapeClick?: (id: string) => void;
  selectedShapeId?: string | null;
}

const Workspace2D: React.FC<Workspace2DProps> = ({ shapes, onShapeClick, selectedShapeId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & zoom state
  const viewRef = useRef({ offsetX: 0, offsetY: 0, scale: 40 });
  const dragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const touchRef = useRef<{ lastDist: number; lastMidX: number; lastMidY: number; startOffsetX: number; startOffsetY: number; startScale: number } | null>(null);

  // World -> Screen
  const worldToScreen = useCallback((wx: number, wy: number, cx: number, cy: number) => {
    const v = viewRef.current;
    return {
      sx: cx + v.offsetX + wx * v.scale,
      sy: cy + v.offsetY - wy * v.scale,
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const v = viewRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // --- Grid ---
    const gridStep = v.scale;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    const startXpx = (cx + v.offsetX) % gridStep;
    const startYpx = (cy + v.offsetY) % gridStep;
    for (let x = startXpx; x < w; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = startYpx; y < h; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Katta grid (5 birlik)
    const bigStep = gridStep * 5;
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    const bigStartX = (cx + v.offsetX) % bigStep;
    const bigStartY = (cy + v.offsetY) % bigStep;
    for (let x = bigStartX; x < w; x += bigStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = bigStartY; y < h; y += bigStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // --- O'qlar (X, Y) ---
    const origin = worldToScreen(0, 0, cx, cy);

    // X o'qi
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, origin.sy);
    ctx.lineTo(w, origin.sy);
    ctx.stroke();

    // Y o'qi
    ctx.strokeStyle = '#44ff44';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(origin.sx, 0);
    ctx.lineTo(origin.sx, h);
    ctx.stroke();

    // O'q raqamlari
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const minWorldX = Math.floor((-cx - v.offsetX) / v.scale) - 1;
    const maxWorldX = Math.ceil((w - cx - v.offsetX) / v.scale) + 1;
    for (let i = minWorldX; i <= maxWorldX; i++) {
      if (i === 0) continue;
      const { sx, sy } = worldToScreen(i, 0, cx, cy);
      ctx.fillText(String(i), sx, sy + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const minWorldY = Math.floor((-cy - v.offsetY) / v.scale) - 1;
    const maxWorldY = Math.ceil((h - cy - v.offsetY) / v.scale) + 1;
    for (let i = -maxWorldY; i <= -minWorldY; i++) {
      if (i === 0) continue;
      const { sx, sy } = worldToScreen(0, i, cx, cy);
      ctx.fillText(String(i), sx - 6, sy);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', origin.sx - 4, origin.sy + 4);

    // --- Shakllar ---
    for (const shape of shapes) {
      const isSelected = shape.id === selectedShapeId;

      if (shape.type === 'dot2d') {
        const { x, y, color, title } = shape.params;
        const { sx, sy } = worldToScreen(x, y, cx, cy);
        const r = isSelected ? 7 : 5;

        if (isSelected) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, r + 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#ccc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(title || `(${x}, ${y})`, sx + 8, sy - 4);
      }

      if (shape.type === 'line2d') {
        const { k, b: lb, color, title } = shape.params;

        // y = kx + b chiziq — ko'rinadigan x oralig'idan chizamiz
        const minWX = (-cx - v.offsetX) / v.scale - 1;
        const maxWX = (w - cx - v.offsetX) / v.scale + 1;
        const wy1 = k * minWX + lb;
        const wy2 = k * maxWX + lb;
        const p1 = worldToScreen(minWX, wy1, cx, cy);
        const p2 = worldToScreen(maxWX, wy2, cx, cy);

        if (isSelected) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Y o'qi bilan kesishgan nuqta (0, b)
        const yIntPt = worldToScreen(0, lb, cx, cy);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(yIntPt.sx, yIntPt.sy, 4, 0, Math.PI * 2);
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(yIntPt.sx, yIntPt.sy, 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#ccc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        const labelText = title || `y = ${k}x ${lb >= 0 ? '+' : ''} ${lb}`;
        ctx.fillText(labelText, yIntPt.sx + 8, yIntPt.sy - 6);
      }

      // --- ELLIPS 2D ---
      if (shape.type === 'ellips2d') {
        const { a, b, cx: ecx, cy: ecy, color, title } = shape.params;
        const steps = 120;

        if (isSelected) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * Math.PI * 2;
          const wx = ecx + a * Math.cos(t);
          const wy = ecy + b * Math.sin(t);
          const { sx, sy } = worldToScreen(wx, wy, cx, cy);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            const wx = ecx + a * Math.cos(t);
            const wy = ecy + b * Math.sin(t);
            const { sx, sy } = worldToScreen(wx, wy, cx, cy);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Markaz nuqtasi
        const center = worldToScreen(ecx, ecy, cx, cy);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(center.sx, center.sy, 3, 0, Math.PI * 2);
        ctx.fill();

        if (title) {
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#ccc';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(title, center.sx, center.sy - 8);
        }
      }

      // --- PARABOLA 2D ---
      if (shape.type === 'parabola2d') {
        const { a: pa, b: pb, c: pc, color, title } = shape.params;

        // Visible world X range
        const minWX = (-cx - v.offsetX) / v.scale - 1;
        const maxWX = (w - cx - v.offsetX) / v.scale + 1;
        const steps = 200;
        const dx = (maxWX - minWX) / steps;

        if (isSelected) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= steps; i++) {
          const wx = minWX + i * dx;
          const wy = pa * wx * wx + pb * wx + pc;
          const { sx, sy } = worldToScreen(wx, wy, cx, cy);
          if (sy < -200 || sy > h + 200) {
            started = false;
            continue;
          }
          if (!started) { ctx.moveTo(sx, sy); started = true; }
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Uchlik (vertex) nuqtasi: x = -b/(2a)
        if (pa !== 0) {
          const vx = -pb / (2 * pa);
          const vy = pa * vx * vx + pb * vx + pc;
          const vp = worldToScreen(vx, vy, cx, cy);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(vp.sx, vp.sy, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        if (title) {
          const labelX = 0;
          const labelY = pa * labelX * labelX + pb * labelX + pc;
          const lp = worldToScreen(labelX, labelY, cx, cy);
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#ccc';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(title, lp.sx + 8, lp.sy - 4);
        }
      }

      // --- GIPERBOLA 2D: y = k/(x+b) + c ---
      if (shape.type === 'hyperbola2d') {
        const { k, b: hb, c: hc, color, title } = shape.params;

        if (isSelected) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;

        // Ko'rinadigan x diapazoni
        const minWX = (-cx - v.offsetX) / v.scale - 1;
        const maxWX = (w - cx - v.offsetX) / v.scale + 1;
        const steps = 300;
        const dx = (maxWX - minWX) / steps;
        const asymptoteX = -hb; // vertikal asimptota: x = -b

        // Chap tarmoq (x < -b)
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= steps; i++) {
          const wx = minWX + i * dx;
          if (wx >= asymptoteX - 0.05) { started = false; continue; }
          const wy = k / (wx + hb) + hc;
          const { sx, sy } = worldToScreen(wx, wy, cx, cy);
          if (sy < -200 || sy > h + 200) { started = false; continue; }
          if (!started) { ctx.moveTo(sx, sy); started = true; }
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // O'ng tarmoq (x > -b)
        ctx.beginPath();
        started = false;
        for (let i = 0; i <= steps; i++) {
          const wx = minWX + i * dx;
          if (wx <= asymptoteX + 0.05) { started = false; continue; }
          const wy = k / (wx + hb) + hc;
          const { sx, sy } = worldToScreen(wx, wy, cx, cy);
          if (sy < -200 || sy > h + 200) { started = false; continue; }
          if (!started) { ctx.moveTo(sx, sy); started = true; }
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Asimptotalar (selected bo'lganda)
        if (isSelected) {
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          // Vertikal: x = -b
          const va = worldToScreen(asymptoteX, 0, cx, cy);
          ctx.beginPath(); ctx.moveTo(va.sx, 0); ctx.lineTo(va.sx, h); ctx.stroke();
          // Gorizontal: y = c
          const ha1 = worldToScreen(minWX, hc, cx, cy);
          const ha2 = worldToScreen(maxWX, hc, cx, cy);
          ctx.beginPath(); ctx.moveTo(ha1.sx, ha1.sy); ctx.lineTo(ha2.sx, ha2.sy); ctx.stroke();
          ctx.setLineDash([]);
        }

        // Label
        if (title) {
          // Label joylashtiramiz: o'ng tarmoqdagi nuqtada
          const labelX = asymptoteX + 1;
          const labelY = k / (labelX + hb) + hc;
          const lp = worldToScreen(labelX, labelY, cx, cy);
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#ccc';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(title, lp.sx + 8, lp.sy - 4);
        }
      }
    }
  }, [shapes, selectedShapeId, worldToScreen]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      draw();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // --- Mouse interactions ---
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const v = viewRef.current;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: v.offsetX, startOffsetY: v.offsetY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    viewRef.current.offsetX = dragRef.current.startOffsetX + dx;
    viewRef.current.offsetY = dragRef.current.startOffsetY + dy;
    draw();
  }, [draw]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    dragRef.current = null;

    if (dx < 4 && dy < 4 && onShapeClick) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const canvasCx = canvas.width / 2;
      const canvasCy = canvas.height / 2;

      let closest: string | null = null;
      let minDist = 15;

      for (const shape of shapes) {
        if (shape.type === 'dot2d') {
          const { sx, sy } = worldToScreen(shape.params.x, shape.params.y, canvasCx, canvasCy);
          const dist = Math.hypot(mx - sx, my - sy);
          if (dist < minDist) { minDist = dist; closest = shape.id; }
        }
        if (shape.type === 'line2d') {
          // y = kx + b → click detection: closest distance from cursor to the infinite line
          const { k, b: lb } = shape.params;
          const vv = viewRef.current;
          const minWX = (-canvasCx - vv.offsetX) / vv.scale - 1;
          const maxWX = (canvas.width - canvasCx - vv.offsetX) / vv.scale + 1;
          const lp1 = worldToScreen(minWX, k * minWX + lb, canvasCx, canvasCy);
          const lp2 = worldToScreen(maxWX, k * maxWX + lb, canvasCx, canvasCy);
          const ldx = lp2.sx - lp1.sx;
          const ldy = lp2.sy - lp1.sy;
          const lenSq = ldx * ldx + ldy * ldy;
          let t = lenSq > 0 ? ((mx - lp1.sx) * ldx + (my - lp1.sy) * ldy) / lenSq : 0;
          t = Math.max(0, Math.min(1, t));
          const projX = lp1.sx + t * ldx;
          const projY = lp1.sy + t * ldy;
          const dist = Math.hypot(mx - projX, my - projY);
          if (dist < minDist) { minDist = dist; closest = shape.id; }
        }

        // Ellips2D click detection
        if (shape.type === 'ellips2d') {
          const { a, b, cx: ecx, cy: ecy } = shape.params;
          const steps = 60;
          for (let i = 0; i <= steps; i++) {
            const tt = (i / steps) * Math.PI * 2;
            const { sx, sy } = worldToScreen(ecx + a * Math.cos(tt), ecy + b * Math.sin(tt), canvasCx, canvasCy);
            const dist = Math.hypot(mx - sx, my - sy);
            if (dist < minDist) { minDist = dist; closest = shape.id; }
          }
        }

        // Parabola2D click detection
        if (shape.type === 'parabola2d') {
          const { a: pa, b: pb, c: pc } = shape.params;
          const vv = viewRef.current;
          const minWX = (-canvasCx - vv.offsetX) / vv.scale - 1;
          const maxWX = (canvas.width - canvasCx - vv.offsetX) / vv.scale + 1;
          const steps = 80;
          const ddx = (maxWX - minWX) / steps;
          for (let i = 0; i <= steps; i++) {
            const wx = minWX + i * ddx;
            const wy = pa * wx * wx + pb * wx + pc;
            const { sx, sy } = worldToScreen(wx, wy, canvasCx, canvasCy);
            const dist = Math.hypot(mx - sx, my - sy);
            if (dist < minDist) { minDist = dist; closest = shape.id; }
          }
        }

        // Hyperbola2D click detection: y = k/(x+b) + c
        if (shape.type === 'hyperbola2d') {
          const { k, b: hb, c: hc } = shape.params;
          const vv = viewRef.current;
          const minWX = (-canvasCx - vv.offsetX) / vv.scale - 1;
          const maxWX = (canvas.width - canvasCx - vv.offsetX) / vv.scale + 1;
          const steps = 80;
          const ddx = (maxWX - minWX) / steps;
          const asymptoteX = -hb;
          for (let i = 0; i <= steps; i++) {
            const wx = minWX + i * ddx;
            if (Math.abs(wx - asymptoteX) < 0.1) continue;
            const wy = k / (wx + hb) + hc;
            const { sx, sy } = worldToScreen(wx, wy, canvasCx, canvasCy);
            const dist = Math.hypot(mx - sx, my - sy);
            if (dist < minDist) { minDist = dist; closest = shape.id; }
          }
        }
      }
      onShapeClick(closest ?? '');
    }
  }, [shapes, onShapeClick, worldToScreen]);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const v = viewRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const canvasCx = canvas.width / 2;
    const canvasCy = canvas.height / 2;

    const worldX = (mx - canvasCx - v.offsetX) / v.scale;
    const worldY = -(my - canvasCy - v.offsetY) / v.scale;

    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(5, Math.min(200, v.scale * factor));

    v.offsetX = mx - canvasCx - worldX * newScale;
    v.offsetY = my - canvasCy + worldY * newScale;
    v.scale = newScale;

    draw();
  }, [draw]);

  // --- Touch interactions (mobile) ---
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const v = viewRef.current;
    if (e.touches.length === 1) {
      // Single finger — pan
      const t = e.touches[0];
      dragRef.current = { startX: t.clientX, startY: t.clientY, startOffsetX: v.offsetX, startOffsetY: v.offsetY };
      touchRef.current = null;
    } else if (e.touches.length === 2) {
      // Two fingers — pinch zoom
      dragRef.current = null;
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      touchRef.current = { lastDist: dist, lastMidX: midX, lastMidY: midY, startOffsetX: v.offsetX, startOffsetY: v.offsetY, startScale: v.scale };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragRef.current) {
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      viewRef.current.offsetX = dragRef.current.startOffsetX + dx;
      viewRef.current.offsetY = dragRef.current.startOffsetY + dy;
      draw();
    } else if (e.touches.length === 2 && touchRef.current) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = midX - rect.left;
      const my = midY - rect.top;
      const canvasCx = canvas.width / 2;
      const canvasCy = canvas.height / 2;

      const factor = dist / touchRef.current.lastDist;
      const newScale = Math.max(5, Math.min(200, touchRef.current.startScale * factor));

      // Zoom towards midpoint
      const worldX = (mx - canvasCx - touchRef.current.startOffsetX) / touchRef.current.startScale;
      const worldY = -(my - canvasCy - touchRef.current.startOffsetY) / touchRef.current.startScale;

      const v = viewRef.current;
      v.scale = newScale;
      v.offsetX = mx - canvasCx - worldX * newScale;
      v.offsetY = my - canvasCy + worldY * newScale;

      draw();
    }
  }, [draw]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      // Check if it was a tap (for shape click)
      if (dragRef.current && onShapeClick) {
        const changedTouch = e.changedTouches[0];
        const dx = Math.abs(changedTouch.clientX - dragRef.current.startX);
        const dy = Math.abs(changedTouch.clientY - dragRef.current.startY);
        if (dx < 10 && dy < 10) {
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const mx = changedTouch.clientX - rect.left;
            const my = changedTouch.clientY - rect.top;
            const canvasCx = canvas.width / 2;
            const canvasCy = canvas.height / 2;
            let closest: string | null = null;
            let minDist = 20; // slightly bigger tap target on mobile

            for (const shape of shapes) {
              if (shape.type === 'dot2d') {
                const { sx, sy } = worldToScreen(shape.params.x, shape.params.y, canvasCx, canvasCy);
                const dist = Math.hypot(mx - sx, my - sy);
                if (dist < minDist) { minDist = dist; closest = shape.id; }
              }
              if (shape.type === 'ellips2d') {
                const { cx: ecx, cy: ecy } = shape.params;
                const center = worldToScreen(ecx, ecy, canvasCx, canvasCy);
                const dist = Math.hypot(mx - center.sx, my - center.sy);
                if (dist < minDist) { minDist = dist; closest = shape.id; }
              }
              if (shape.type === 'line2d') {
                const { b: lb } = shape.params;
                const yIntPt = worldToScreen(0, lb, canvasCx, canvasCy);
                const dist = Math.hypot(mx - yIntPt.sx, my - yIntPt.sy);
                if (dist < minDist) { minDist = dist; closest = shape.id; }
              }
              if (shape.type === 'parabola2d') {
                if (shape.params.a !== 0) {
                  const vx = -shape.params.b / (2 * shape.params.a);
                  const vy = shape.params.a * vx * vx + shape.params.b * vx + shape.params.c;
                  const vp = worldToScreen(vx, vy, canvasCx, canvasCy);
                  const dist = Math.hypot(mx - vp.sx, my - vp.sy);
                  if (dist < minDist) { minDist = dist; closest = shape.id; }
                }
              }
              if (shape.type === 'hyperbola2d') {
                // Tap near the right branch point
                const asymX = -shape.params.b + 1;
                const tapY = shape.params.k / (asymX + shape.params.b) + shape.params.c;
                const pt = worldToScreen(asymX, tapY, canvasCx, canvasCy);
                const dist = Math.hypot(mx - pt.sx, my - pt.sy);
                if (dist < minDist) { minDist = dist; closest = shape.id; }
              }
            }
            onShapeClick(closest ?? '');
          }
        }
      }
      dragRef.current = null;
      touchRef.current = null;
    } else if (e.touches.length === 1) {
      // Went from 2 fingers to 1 — restart pan from current position
      const v = viewRef.current;
      const t = e.touches[0];
      dragRef.current = { startX: t.clientX, startY: t.clientY, startOffsetX: v.offsetX, startOffsetY: v.offsetY };
      touchRef.current = null;
    }
  }, [shapes, onShapeClick, worldToScreen, draw]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { dragRef.current = null; }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { dragRef.current = null; touchRef.current = null; }}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }}
      />
    </div>
  );
};

export default Workspace2D;