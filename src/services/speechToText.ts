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
    onError("Speech recognition is not supported in this browser. Please use Google Chrome.");
    return { stop: () => {} };
  }
  const recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = language;

  recognition.onresult = (event: any) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += transcript + " ";
      else interim += transcript;
    }
    if (final) onResult(final, true);
    if (interim) onResult(interim, false);
  };
  recognition.onerror = (e: any) => onError(e.error || "Recognition error");
  recognition.start();
  return { stop: () => recognition.stop() };
}
