"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageThread } from "@/components/messaging/message-thread";
import { useConversationRealtime } from "@/components/messaging/use-conversation-realtime";
import { Button } from "@/components/ui/button";
import {
  fetchMessages,
  markConversationReadRequest,
  sendMessageRequest,
  uploadMessageMedia,
} from "@/lib/messaging/api-client";
import type { ConversationListItem, MessageItem } from "@/lib/messaging/types";

type ClientMessagesClientProps = {
  organizationId: string;
  clerkUserId: string;
  initialConversation: ConversationListItem | null;
};

export function ClientMessagesClient({
  organizationId,
  clerkUserId,
  initialConversation,
}: ClientMessagesClientProps) {
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!conversation?.id) {
      return;
    }

    let cancelled = false;

    fetchMessages(conversation.id, { limit: 50 })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setMessages(payload.items);
        return markConversationReadRequest(conversation.id).catch(
          () => undefined,
        );
      })
      .then(() => {
        if (cancelled) {
          return;
        }
        setConversation((current) =>
          current ? { ...current, unreadCount: 0 } : current,
        );
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Messages indisponibles.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversation?.id]);

  const threadMessages = conversation?.id
    ? messages.filter((message) => message.conversationId === conversation.id)
    : [];

  const { publishTyping } = useConversationRealtime(
    organizationId,
    conversation?.id ?? null,
    clerkUserId,
    {
      onMessageNew: (message) => {
        if (message.senderClerkUserId === clerkUserId) {
          return;
        }

        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) {
            return current;
          }
          return [...current, message];
        });

        if (conversation?.id) {
          void markConversationReadRequest(conversation.id, {
            messageId: message.id,
          });
        }
      },
      onMessageRead: (payload) => {
        if (payload.clerkUserId === clerkUserId) {
          return;
        }

        setConversation((current) =>
          current
            ? { ...current, coachLastReadAt: payload.lastReadAt }
            : current,
        );
      },
      onTyping: (payload) => {
        if (payload.clerkUserId === clerkUserId) {
          return;
        }

        setTypingLabel(payload.isTyping ? "Votre coach écrit" : null);
      },
    },
  );

  async function handleSend() {
    if (!conversation?.id || !text.trim()) {
      return;
    }

    setSending(true);
    try {
      const message = await sendMessageRequest(conversation.id, {
        type: "text",
        content: text.trim(),
      });
      setMessages((current) => [...current, message]);
      setText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  async function handleMediaFile(file: File, durationSeconds?: number) {
    if (!conversation?.id) {
      return;
    }

    setSending(true);
    try {
      const uploaded = await uploadMessageMedia(conversation.id, file);
      const message = await sendMessageRequest(conversation.id, {
        type: uploaded.mediaType,
        mediaPathname: uploaded.pathname,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        durationSeconds,
      });
      setMessages((current) => [...current, message]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  if (!conversation) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-title-lg text-on-dark font-bold tracking-tight">
            Messages
          </h1>
          <p className="text-body-md text-muted mt-2">
            Votre fil de discussion avec votre coach apparaîtra ici.
          </p>
        </div>
        <div className="border-hairline bg-surface-card flex min-h-[420px] flex-col items-center justify-center rounded-lg border px-6 text-center">
          <p className="text-title-sm text-on-dark font-semibold">
            Pas encore de conversation
          </p>
          <p className="text-body-md text-muted mt-2 max-w-md">
            Votre coach vous contactera bientôt. Vous pourrez aussi lui écrire
            dès qu&apos;une conversation sera ouverte.
          </p>
          <Button type="button" className="mt-6" disabled>
            Écrire à mon coach
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-6">
      <div>
        <h1 className="text-title-lg text-on-dark font-bold tracking-tight">
          Messages
        </h1>
        <p className="text-body-md text-muted mt-2">
          Échangez avec votre coach en texte, photo, vidéo ou vocal.
        </p>
      </div>

      <div className="border-hairline flex min-h-[560px] flex-1 overflow-hidden rounded-lg border">
        <MessageThread
          conversation={conversation}
          messages={threadMessages}
          text={text}
          onTextChange={setText}
          onSend={() => void handleSend()}
          onFileSelect={(file) => void handleMediaFile(file)}
          onVoiceRecorded={(file, durationSeconds) =>
            void handleMediaFile(file, durationSeconds)
          }
          onTyping={(isTyping) => void publishTyping(isTyping)}
          sending={sending}
          typingLabel={typingLabel}
          peerReadAt={conversation.coachLastReadAt}
          showVoice
          emptyTitle="Conversation"
          emptyDescription="Votre fil s'affichera ici."
        />
      </div>
    </div>
  );
}
