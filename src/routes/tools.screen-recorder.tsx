import { createFileRoute } from "@tanstack/react-router";
import { tools } from "@/lib/tools";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { useState, useRef } from "react";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";

export const Route = createFileRoute("/tools/screen-recorder")({
  head: () => buildToolMeta(toolBySlug("screen-recorder", tools)), => d + 1), 1000);
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        setError("Could not start recording. Please try again.");
      }
    }
  };

  const stop = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
  };

  const download = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
    a.click();
  };

  const reset = () => {
    setVideoUrl("");
    setState("idle");
    setDuration(0);
    setError("");
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <ToolPageShell title="Screen Recorder" description="Record your screen with audio directly in the browser — no installs needed.">
      <div className="w-full space-y-5">
        <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-8 text-center space-y-6">
          <div className="space-y-3">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center border-2 transition-all ${
              state === "recording"
                ? "border-red-500 bg-red-500/10 animate-pulse"
                : state === "stopped"
                ? "border-green-500 bg-green-500/10"
                : "border-[#1e2d4a] bg-[#0a0f1e]"
            }`}>
              {state === "recording" ? (
                <div className="w-5 h-5 bg-red-500 rounded-sm" />
              ) : state === "stopped" ? (
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-200">
                {state === "idle" && "Ready to Record"}
                {state === "recording" && "Recording..."}
                {state === "stopped" && "Recording Complete"}
              </p>
              {state === "recording" && (
                <p className="text-red-400 font-mono text-2xl font-bold mt-1">
                  {formatTime(duration)}
                </p>
              )}
              {state === "idle" && (
                <p className="text-gray-600 text-sm mt-1">
                  Captures screen + audio • Runs entirely in browser
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {state === "idle" && (
              <button
                onClick={start}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Recording
              </button>
            )}
            {state === "recording" && (
              <button
                onClick={stop}
                className="w-full py-4 rounded-2xl bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-400 font-semibold text-base transition-all"
              >
                Stop Recording
              </button>
            )}
            {state === "stopped" && (
              <div className="space-y-3">
                <button
                  onClick={download}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Download Recording (.webm)
                </button>
                <button
                  onClick={reset}
                  className="w-full py-3 rounded-2xl border border-[#1e2d4a] text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-all"
                >
                  Record Again
                </button>
              </div>
            )}
          </div>
        </div>

        {videoUrl && (
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Preview</p>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-xl max-h-64 bg-black"
            />
            <p className="text-xs text-gray-600 text-center">
              Duration: {formatTime(duration)}
            </p>
          </div>
        )}

        {state === "idle" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🖥️", label: "Full Screen", desc: "or any window/tab" },
              { icon: "🎙️", label: "With Audio", desc: "system + mic" },
              { icon: "🔒", label: "100% Private", desc: "no upload, local only" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-4 text-center"
              >
                <p className="text-2xl mb-1">{item.icon}</p>
                <p className="text-xs font-medium text-gray-300">{item.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <HowToUse steps={[
        "Click Start Recording and pick a screen, window or tab.",
        "Record your actions; click Stop when finished.",
        "Preview the result and download it as a .webm file.",
      ]} />
    </ToolPageShell>
  );
}
