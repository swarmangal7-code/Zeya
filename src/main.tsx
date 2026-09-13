import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/cormorant-garamond/300.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "./styles/global.css";
import App from "./App";
import { audio, initAudioOnInteraction } from "./audio/AudioManager";

initAudioOnInteraction();

if (import.meta.env.DEV) {
  // test-only probe for headless verification
  (window as unknown as Record<string, unknown>).__zeyaAudio = {
    ctxState: () => (audio as unknown as { ctx: AudioContext | null }).ctx?.state ?? "none",
    lastError: () => (audio as unknown as { lastError: string | null }).lastError,
    ambientStarted: () => (audio as unknown as { started: boolean }).started,
    buffers: () => (audio as unknown as { buffers: Map<string, AudioBuffer> }).buffers.size,
    unlock: () => audio.unlock(),
  };
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);