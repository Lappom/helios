"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_DURATION_SECONDS = 300;

type VoiceRecorderProps = {
  onRecorded: (file: File, durationSeconds: number) => void;
  disabled?: boolean;
};

export function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  async function startRecording() {
    if (disabled || recording) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - startTimeRef.current) / 1000),
        );
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const extension = mimeType.includes("webm") ? "webm" : "m4a";
        const file = new File([blob], `voice-${Date.now()}.${extension}`, {
          type: mimeType,
        });
        onRecorded(file, durationSeconds);
        setElapsed(0);
      };

      startTimeRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setElapsed(0);

      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(seconds);
        if (seconds >= MAX_DURATION_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch {
      // Microphone permission denied or unavailable.
    }
  }

  function formatElapsed(value: number) {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={recording ? "destructive" : "ghost"}
        size="icon"
        aria-label={recording ? "Arrêter l'enregistrement" : "Enregistrer un vocal"}
        disabled={disabled}
        onClick={() => {
          if (recording) {
            stopRecording();
          } else {
            void startRecording();
          }
        }}
      >
        {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
      </Button>
      {recording ? (
        <span
          className={cn(
            "text-caption text-accent-rose animate-pulse",
            elapsed >= MAX_DURATION_SECONDS - 10 && "text-accent-rose",
          )}
        >
          {formatElapsed(elapsed)} / {formatElapsed(MAX_DURATION_SECONDS)}
        </span>
      ) : null}
    </div>
  );
}
