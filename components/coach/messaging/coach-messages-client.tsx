"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { ConversationList } from "@/components/messaging/conversation-list";
import { MessageThread } from "@/components/messaging/message-thread";
import { useConversationRealtime } from "@/components/messaging/use-conversation-realtime";
import { CreateGroupDialog } from "@/components/coach/messaging/create-group-dialog";
import { GroupMessagingGate } from "@/components/coach/messaging/group-messaging-gate";
import { GroupParticipantsDialog } from "@/components/coach/messaging/group-participants-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createDirectConversation,
  fetchMessages,
  markConversationReadRequest,
  sendMessageRequest,
  uploadMessageMedia,
} from "@/lib/messaging/api-client";
import type { ConversationListItem, MessageItem } from "@/lib/messaging/types";

type CoachMessagesClientProps = {
  organizationId: string;
  clerkUserId: string;
  initialConversations: ConversationListItem[];
  clients: { id: string; firstName: string; lastName: string; email: string }[];
};

export function CoachMessagesClient({
  organizationId,
  clerkUserId,
  initialConversations,
  clients,
}: CoachMessagesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] =
    useState<ConversationListItem[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("conversationId") ?? initialConversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const isGroupSelected = selectedConversation?.type === "group";

  useEffect(() => {
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return;
    }

    void createDirectConversation({ clientId })
      .then((conversation) => {
        setConversations((current) => {
          const exists = current.some((item) => item.id === conversation.id);
          if (exists) {
            return current.map((item) =>
              item.id === conversation.id ? conversation : item,
            );
          }
          return [conversation, ...current];
        });
        setSelectedId(conversation.id);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Conversation impossible.",
        );
      });
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    let cancelled = false;

    fetchMessages(selectedId, { limit: 50 })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setMessages(payload.items);
        return markConversationReadRequest(selectedId).catch(() => undefined);
      })
      .then(() => {
        if (cancelled) {
          return;
        }
        setConversations((current) =>
          current.map((item) =>
            item.id === selectedId ? { ...item, unreadCount: 0 } : item,
          ),
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
  }, [selectedId]);

  const threadMessages = selectedId
    ? messages.filter((message) => message.conversationId === selectedId)
    : [];

  const { publishTyping } = useConversationRealtime(
    organizationId,
    selectedId,
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

        setConversations((current) =>
          current.map((item) =>
            item.id === selectedId
              ? {
                  ...item,
                  lastMessageAt: message.createdAt,
                  lastMessagePreview:
                    message.type === "text"
                      ? (message.content ?? "")
                      : message.type,
                  unreadCount: 0,
                }
              : {
                  ...item,
                  unreadCount: item.id === selectedId ? 0 : item.unreadCount + 1,
                },
          ),
        );

        if (selectedId) {
          void markConversationReadRequest(selectedId, {
            messageId: message.id,
          });
        }
      },
      onMessageRead: (payload) => {
        if (payload.clerkUserId === clerkUserId) {
          return;
        }

        setConversations((current) =>
          current.map((item) =>
            item.id === selectedId
              ? { ...item, clientLastReadAt: payload.lastReadAt }
              : item,
          ),
        );
      },
      onTyping: (payload) => {
        if (payload.clerkUserId === clerkUserId) {
          return;
        }

        setTypingLabel(
          payload.isTyping
            ? isGroupSelected
              ? "Un participant écrit"
              : "Le client écrit"
            : null,
        );
      },
    },
  );

  async function handleSend() {
    if (!selectedId || !text.trim()) {
      return;
    }

    setSending(true);
    try {
      const message = await sendMessageRequest(selectedId, {
        type: "text",
        content: text.trim(),
      });
      setMessages((current) => [...current, message]);
      setText("");
      setConversations((current) =>
        current.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                lastMessageAt: message.createdAt,
                lastMessagePreview: message.content,
              }
            : item,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  async function handleMediaFile(file: File, durationSeconds?: number) {
    if (!selectedId) {
      return;
    }

    setSending(true);
    try {
      const uploaded = await uploadMessageMedia(selectedId, file);
      const message = await sendMessageRequest(selectedId, {
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

  async function handleStartConversation(clientId: string) {
    try {
      const conversation = await createDirectConversation({ clientId });
      setConversations((current) => {
        const exists = current.some((item) => item.id === conversation.id);
        return exists
          ? current.map((item) =>
              item.id === conversation.id ? conversation : item,
            )
          : [conversation, ...current];
      });
      setSelectedId(conversation.id);
      setNewDialogOpen(false);
      router.replace(`/coach/messages?conversationId=${conversation.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Conversation impossible.",
      );
    }
  }

  function handleGroupCreated(conversation: ConversationListItem) {
    setConversations((current) => [conversation, ...current]);
    setSelectedId(conversation.id);
    router.replace(`/coach/messages?conversationId=${conversation.id}`);
  }

  function handleParticipantsChange(count: number) {
    if (!selectedId) {
      return;
    }
    setConversations((current) =>
      current.map((item) =>
        item.id === selectedId ? { ...item, participantCount: count } : item,
      ),
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-title-lg text-on-dark font-bold tracking-tight">
            Messages
          </h1>
          <p className="text-body-md text-muted mt-2">
            Conversations directes et groupes avec vos clients.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setNewDialogOpen(true)}>
            <Plus className="size-4" />
            Nouvelle conversation
          </Button>
          <GroupMessagingGate>
            <Button type="button" onClick={() => setGroupDialogOpen(true)}>
              <Users className="size-4" />
              Nouveau groupe
            </Button>
          </GroupMessagingGate>
        </div>
      </div>

      <div className="border-hairline flex min-h-[560px] flex-1 overflow-hidden rounded-lg border">
        <aside className="border-hairline bg-surface-card w-full max-w-[320px] shrink-0 border-r md:block">
          <ConversationList
            items={conversations}
            selectedId={selectedId}
            onSelect={(conversation) => {
              setSelectedId(conversation.id);
              router.replace(
                `/coach/messages?conversationId=${conversation.id}`,
              );
            }}
          />
        </aside>
        <MessageThread
          conversation={selectedConversation}
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
          peerReadAt={selectedConversation?.clientLastReadAt}
          showVoice
          headerActions={
            isGroupSelected ? (
              <GroupMessagingGate>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setParticipantsDialogOpen(true)}
                >
                  <Users className="size-4" />
                  Participants
                </Button>
              </GroupMessagingGate>
            ) : null
          }
        />
      </div>

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="bg-surface-card border-hairline max-w-md">
          <DialogHeader>
            <DialogTitle className="text-on-dark">
              Démarrer une conversation
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => void handleStartConversation(client.id)}
                className="border-hairline hover:bg-surface-elevated flex w-full flex-col rounded-md border px-4 py-3 text-left"
              >
                <span className="text-on-dark font-medium">
                  {client.firstName} {client.lastName}
                </span>
                <span className="text-muted text-sm">{client.email}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CreateGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        clients={clients}
        onCreated={handleGroupCreated}
      />

      <GroupParticipantsDialog
        open={participantsDialogOpen}
        onOpenChange={setParticipantsDialogOpen}
        conversationId={selectedId}
        groupName={selectedConversation?.name ?? "Groupe"}
        clients={clients}
        onParticipantsChange={handleParticipantsChange}
      />
    </div>
  );
}
