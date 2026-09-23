import { CaptionItem } from '../types';

export function formatTimeSRT(seconds: number): string {
  const pad = (num: number, size = 2) => String(Math.floor(num)).padStart(size, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const millis = Math.floor((secs - wholeSecs) * 1000);
  return `${pad(hrs)}:${pad(mins)}:${pad(wholeSecs)},${pad(millis, 3)}`;
}

export function formatTimeVTT(seconds: number): string {
  const pad = (num: number, size = 2) => String(Math.floor(num)).padStart(size, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const millis = Math.floor((secs - wholeSecs) * 1000);
  return `${pad(hrs)}:${pad(mins)}:${pad(wholeSecs)}.${pad(millis, 3)}`;
}

export function formatSeconds(seconds: number, includeDecimals = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (includeDecimals) {
    const s = secs.toFixed(1);
    const wholeSecs = Math.floor(secs);
    const ms = Math.round((secs - wholeSecs) * 10);
    return `${String(mins).padStart(2, '0')}:${String(wholeSecs).padStart(2, '0')}.${ms}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(Math.floor(secs)).padStart(2, '0')}`;
}

export function generateSRT(captions: CaptionItem[], offsetSeconds = 0): string {
  // Sort captions by startTime
  const sorted = [...captions].sort((a, b) => a.startTime - b.startTime);
  return sorted
    .map((item, index) => {
      const relStart = Math.max(0, item.startTime - offsetSeconds);
      const relEnd = Math.max(relStart + 0.1, item.endTime - offsetSeconds);
      return `${index + 1}\n${formatTimeSRT(relStart)} --> ${formatTimeSRT(relEnd)}\n${item.text.trim()}\n`;
    })
    .join('\n');
}

export function generateVTT(captions: CaptionItem[], offsetSeconds = 0): string {
  const sorted = [...captions].sort((a, b) => a.startTime - b.startTime);
  let vtt = 'WEBVTT - Exported with ClipCraft\n\n';
  sorted.forEach((item, index) => {
    const relStart = Math.max(0, item.startTime - offsetSeconds);
    const relEnd = Math.max(relStart + 0.1, item.endTime - offsetSeconds);
    vtt += `${index + 1}\n${formatTimeVTT(relStart)} --> ${formatTimeVTT(relEnd)}\n${item.text.trim()}\n\n`;
  });
  return vtt;
}

export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseYouTubeUrl(url: string): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const match = cleaned.match(regExp);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) return cleaned;
  return null;
}
