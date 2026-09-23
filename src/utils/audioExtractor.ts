/**
 * Audio Extraction & Slicing Utility for Gemini Audio Transcription
 */

// Convert AudioBuffer to standard 16-bit PCM WAV Blob
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let interleaved: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    let index = 0;
    for (let i = 0; i < left.length; i++) {
      interleaved[index++] = left[i];
      interleaved[index++] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = interleaved.length * bytesPerSample;
  const bufferLength = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // 16 for PCM
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Convert Blob to Base64
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data:*/*;base64, prefix
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extracts and slices audio from a local blob or audio/video URL
 */
export async function extractAudioSegment(
  source: Blob | string,
  startTime: number,
  endTime: number
): Promise<{ base64Audio: string; mimeType: string; duration: number }> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    let arrayBuffer: ArrayBuffer;
    if (typeof source === 'string') {
      const response = await fetch(source);
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await source.arrayBuffer();
    }

    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const sampleRate = decodedBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startTime * sampleRate));
    const endSample = Math.min(decodedBuffer.length, Math.floor(endTime * sampleRate));
    const frameCount = Math.max(1, endSample - startSample);

    // Create sliced buffer
    const slicedBuffer = audioContext.createBuffer(
      decodedBuffer.numberOfChannels,
      frameCount,
      sampleRate
    );

    for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
      const originalData = decodedBuffer.getChannelData(channel);
      const slicedData = slicedBuffer.getChannelData(channel);
      slicedData.set(originalData.subarray(startSample, endSample));
    }

    const wavBlob = audioBufferToWav(slicedBuffer);
    const base64Audio = await blobToBase64(wavBlob);

    return {
      base64Audio,
      mimeType: 'audio/wav',
      duration: frameCount / sampleRate,
    };
  } finally {
    audioContext.close().catch(() => {});
  }
}

/**
 * Capture microphone or system audio for a segment
 */
export async function captureAudioSegment(
  durationSeconds: number,
  onTick?: (elapsed: number) => void
): Promise<{ base64Audio: string; mimeType: string }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const base64 = await blobToBase64(audioBlob);
      resolve({
        base64Audio: base64,
        mimeType: mediaRecorder.mimeType || 'audio/webm',
      });
    };

    mediaRecorder.onerror = (e) => {
      stream.getTracks().forEach((track) => track.stop());
      reject(e);
    };

    mediaRecorder.start();

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.5;
      onTick?.(Math.min(durationSeconds, elapsed));
      if (elapsed >= durationSeconds) {
        clearInterval(interval);
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }
    }, 500);
  });
}
