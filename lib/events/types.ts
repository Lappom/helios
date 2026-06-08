export type HeliosEventName =
  | "client.created"
  | "assessment.submitted"
  | "payment.received"
  | "program.published"
  | "message.new"
  | "drive.file.shared"
  | "video.published"
  | "session.completed"
  | "form.completed";

export type ClientCreatedPayload = {
  organizationId: string;
  clientId: string;
  source: "checkout" | "manual" | "import";
  bookingId?: string;
};

export type PaymentReceivedPayload = {
  organizationId: string;
  paymentId: string;
  clientId?: string;
  amountCents: number;
  type: "subscription" | "one_time" | "external";
  source: "manual" | "booking" | "import";
};

export type ProgramPublishedPayload = {
  organizationId: string;
  programId: string;
  clientId: string;
  assignmentId: string;
};

export type MessageNewPayload = {
  organizationId: string;
  conversationId: string;
  conversationType: "direct" | "group";
  clientId?: string;
  senderClerkUserId: string;
  messageId: string;
};

export type DriveFileSharedPayload = {
  organizationId: string;
  clientId: string;
  shareId: string;
  sharedByClerkUserId: string;
  fileId?: string;
  folderId?: string;
};

export type VideoPublishedPayload = {
  organizationId: string;
  videoId: string;
  coachClerkUserId: string;
  visibility: "all_clients" | "selected";
};

export type SessionCompletedPayload = {
  organizationId: string;
  clientId: string;
  sessionLogId: string;
  programSessionId: string;
};

export type FormCompletedPayload = {
  organizationId: string;
  clientId: string;
  sessionLogId: string;
  feedbackId: string;
};

export type HeliosEventPayload = {
  "client.created": ClientCreatedPayload;
  "assessment.submitted": {
    organizationId: string;
    assessmentId: string;
    clientId: string;
  };
  "payment.received": PaymentReceivedPayload;
  "program.published": ProgramPublishedPayload;
  "message.new": MessageNewPayload;
  "drive.file.shared": DriveFileSharedPayload;
  "video.published": VideoPublishedPayload;
  "session.completed": SessionCompletedPayload;
  "form.completed": FormCompletedPayload;
};
