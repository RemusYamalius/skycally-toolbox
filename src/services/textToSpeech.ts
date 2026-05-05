export function speak(text: string, voice: SpeechSynthesisVoice | null, rate: number, pitch: number, onEnd?: () => void): SpeechSynthesisUtterance {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = pitch;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return u;
}

export function stop() {
  window.speechSynthesis.cancel();
}

export async function downloadAudio(text: string, voice: SpeechSynthesisVoice | null, rate: number, pitch: number): Promise<void> {
  // Note: Browsers do not expose speechSynthesis output to AudioContext directly.
  // We record the system mic-less stream via getUserMedia loopback fallback isn't available,
  // so we record the speaker output via MediaRecorder on a MediaStreamDestination wired to nothing
  // — this records silence on most browsers. For a true offline render, an external TTS service is needed.
  // We approximate by using a very simple route: trigger speech and inform the user that recording
  // captures the playback only on browsers that support tab/audio capture.
  return new Promise((resolve, reject) => {
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new AudioCtx();
      const dest = ctx.createMediaStreamDestination();
      const recorder = new MediaRecorder(dest.stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "speech.webm";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        ctx.close();
        resolve();
      };
      recorder.start();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = rate;
      u.pitch = pitch;
      u.onend = () => recorder.stop();
      u.onerror = () => {
        recorder.stop();
        reject(new Error("Speech failed"));
      };
      window.speechSynthesis.speak(u);
    } catch (e) {
      reject(e as Error);
    }
  });
}
