export interface RecognitionHandle {
  stop: () => void;
}

export function startRecognition(
  language: string,
  onResult: (text: string, isFinal: boolean) => void,
  onError: (error: string) => void,
): RecognitionHandle {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    onError("Speech recognition is not supported. Please use Google Chrome.");
    return { stop: () => {} };
  }

  const recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = language;
  recognition.maxAlternatives = 1;

  let stopped = false;

  recognition.onresult = (event: any) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        onResult(transcript + " ", true);
      } else {
        interim = transcript;
      }
    }
    if (interim) onResult(interim, false);
  };

  recognition.onerror = (e: any) => {
    if (e.error === "no-speech" || e.error === "aborted") return;
    onError(e.error || "Recognition error");
  };

  recognition.onend = () => {
    if (!stopped) {
      try { recognition.start(); } catch {}
    }
  };

  recognition.start();
  return {
    stop: () => {
      stopped = true;
      try { recognition.stop(); } catch {}
    }
  };
}
