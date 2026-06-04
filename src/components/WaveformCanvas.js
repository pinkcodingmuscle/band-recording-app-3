import React, { useEffect, useRef, useState } from 'react';

/**
 * Renders a real audio waveform from an audioUrl by decoding the PCM data
 * with the Web Audio API and drawing per-pixel RMS amplitude onto a canvas.
 * Falls back to the ascii waveform string if decoding fails.
 */
export default function WaveformCanvas({ audioUrl, fallback, className = '' }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!audioUrl || !canvasRef.current) return;
    let cancelled = false;

    async function draw() {
      try {
        const resp = await fetch(audioUrl);
        if (!resp.ok) throw new Error('fetch failed');
        const arrayBuffer = await resp.arrayBuffer();
        if (cancelled) return;

        const actx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await actx.decodeAudioData(arrayBuffer);
        actx.close();
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { width, height } = canvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        const data = audioBuffer.getChannelData(0); // left / mono channel
        const samplesPerPx = Math.max(1, Math.floor(data.length / width));
        const mid = height / 2;
        const amp = mid * 0.85;

        // Use CSS variable for accent color; fall back to indigo
        const color = getComputedStyle(document.documentElement)
          .getPropertyValue('--accent-primary').trim() || '#6366f1';

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const start = x * samplesPerPx;
          let sum = 0;
          for (let i = 0; i < samplesPerPx; i++) {
            const s = data[start + i] ?? 0;
            sum += s * s;
          }
          const rms = Math.sqrt(sum / samplesPerPx);
          const h = Math.max(1, rms * amp);
          ctx.moveTo(x + 0.5, mid - h);
          ctx.lineTo(x + 0.5, mid + h);
        }
        ctx.stroke();
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    setFailed(false);
    draw();
    return () => { cancelled = true; };
  }, [audioUrl]);

  if (!audioUrl || failed) {
    return (
      <span className={`waveform-ascii ${className}`} aria-hidden="true">
        {fallback || '▁▂▃▄▅▆▇▆▅▄▃▂▁'}
      </span>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={56}
      className={`waveform-canvas ${className}`}
      aria-hidden="true"
    />
  );
}
