"use client";

import { useRef } from "react";
import { ImageIcon, Mic, Paperclip, Send, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "@/components/messaging/voice-recorder";

type MessageInputProps = {
  text: string;
  onTextChange: (value: string) => void;
  onSend: () => void;
  onTyping?: (isTyping: boolean) => void;
  onFileSelect: (file: File) => void;
  onVoiceRecorded: (file: File, durationSeconds: number) => void;
  sending?: boolean;
  showVoice?: boolean;
};

export function MessageInput({
  text,
  onTextChange,
  onSend,
  onTyping,
  onFileSelect,
  onVoiceRecorded,
  sending,
  showVoice = true,
}: MessageInputProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  function handleTextChange(value: string) {
    onTextChange(value);
    onTyping?.(true);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      onTyping?.(false);
    }, 2000);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="border-hairline bg-surface-card border-t p-4">
      <div className="flex items-end gap-2">
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Envoyer une photo"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Envoyer une vidéo"
            onClick={() => videoInputRef.current?.click()}
          >
            <Video className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Joindre un fichier"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" />
          </Button>
          {showVoice ? (
            <VoiceRecorder onRecorded={onVoiceRecorded} disabled={sending} />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Message vocal"
              disabled
            >
              <Mic className="size-4" />
            </Button>
          )}
        </div>

        <Textarea
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message..."
          rows={2}
          className="bg-surface-elevated min-h-[44px] flex-1 resize-none"
        />

        <Button
          type="button"
          onClick={onSend}
          disabled={sending || !text.trim()}
          className="shrink-0"
        >
          <Send className="size-4" />
        </Button>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFileSelect(file);
          }
          event.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFileSelect(file);
          }
          event.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFileSelect(file);
          }
          event.target.value = "";
        }}
      />
    </div>
  );
}
