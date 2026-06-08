"use client";

import { useEffect, useRef } from "react";
import Ably from "ably";
import { fetchAblyToken } from "@/lib/messaging/api-client";
import type { MessageItem } from "@/lib/messaging/types";
import { conversationChannel } from "@/lib/realtime/channels";

type RealtimeHandlers = {
  onMessageNew?: (message: MessageItem) => void;
  onMessageRead?: (payload: {
    clerkUserId: string;
    lastReadAt: string;
  }) => void;
  onTyping?: (payload: { clerkUserId: string; isTyping: boolean }) => void;
};

export function useConversationRealtime(
  organizationId: string,
  conversationId: string | null,
  clerkUserId: string,
  handlers: RealtimeHandlers,
) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let client: Ably.Realtime | null = null;
    let channel: Ably.RealtimeChannel | null = null;
    let cancelled = false;

    async function connect() {
      const { tokenRequest } = await fetchAblyToken();
      if (cancelled) {
        return;
      }

      client = new Ably.Realtime({
        authCallback: (_tokenParams, callback) => {
          callback(null, tokenRequest);
        },
        clientId: clerkUserId,
      });

      channel = client.channels.get(
        conversationChannel(organizationId, conversationId!),
      );

      channel.subscribe("message.new", (message) => {
        const payload = message.data as { message?: MessageItem };
        if (payload.message) {
          handlersRef.current.onMessageNew?.(payload.message);
        }
      });

      channel.subscribe("message.read", (message) => {
        const payload = message.data as {
          clerkUserId: string;
          lastReadAt: string;
        };
        handlersRef.current.onMessageRead?.(payload);
      });

      channel.subscribe("typing", (message) => {
        const payload = message.data as {
          clerkUserId: string;
          isTyping: boolean;
        };
        handlersRef.current.onTyping?.(payload);
      });
    }

    void connect().catch((error) => {
      console.error("[messaging:realtime] connection failed", error);
    });

    return () => {
      cancelled = true;
      channel?.unsubscribe();
      client?.close();
    };
  }, [organizationId, conversationId, clerkUserId]);

  async function publishTyping(isTyping: boolean) {
    if (!conversationId) {
      return;
    }

    try {
      const { tokenRequest } = await fetchAblyToken();
      const client = new Ably.Realtime({
        authCallback: (_tokenParams, callback) => {
          callback(null, tokenRequest);
        },
        clientId: clerkUserId,
      });

      const channel = client.channels.get(
        conversationChannel(organizationId, conversationId),
      );
      await channel.publish("typing", { clerkUserId, isTyping });
      client.close();
    } catch {
      // Typing is best-effort.
    }
  }

  return { publishTyping };
}
