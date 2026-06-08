import type { CreateNotificationTemplateInput } from "@/lib/validators/notifications";

type SystemTemplateSeed = CreateNotificationTemplateInput & {
  isSystem: true;
};

export const SYSTEM_NOTIFICATION_TEMPLATES: SystemTemplateSeed[] = [
  {
    name: "Rappel séance",
    channel: "email",
    subject: "Séance du jour : {{sessionName}}",
    content:
      "Bonjour {{clientName}},\n\nVotre séance {{sessionName}} est prévue aujourd'hui. Bon entraînement !",
    trigger: "event",
    eventType: "session_due",
    isActive: true,
    isSystem: true,
  },
  {
    name: "Bilan à compléter",
    channel: "email",
    subject: "Votre bilan est attendu",
    content:
      "Bonjour {{clientName}},\n\nUn bilan est à compléter avant le {{dueDate}}. Connectez-vous à Helios pour le remplir.",
    trigger: "event",
    eventType: "assessment_due",
    isActive: true,
    isSystem: true,
  },
  {
    name: "Rappel habitude",
    channel: "push",
    subject: "Habitude du jour",
    content: "N'oubliez pas : {{habitName}}",
    trigger: "event",
    eventType: "habit_reminder",
    isActive: true,
    isSystem: true,
  },
  {
    name: "Rappel RDV",
    channel: "email",
    subject: "Rappel de rendez-vous",
    content:
      "Bonjour {{clientName}},\n\nVotre rendez-vous est prévu le {{bookingTime}}.",
    trigger: "event",
    eventType: "booking_reminder",
    isActive: true,
    isSystem: true,
  },
  {
    name: "Paiement reçu",
    channel: "email",
    subject: "Paiement reçu",
    content: "Un paiement de {{amount}} a été enregistré.",
    trigger: "event",
    eventType: "payment_received",
    isActive: true,
    isSystem: true,
  },
  {
    name: "Programme publié",
    channel: "in_app",
    subject: "Nouveau programme",
    content:
      "Bonjour {{clientName}},\n\nVotre coach vient de vous assigner le programme {{programName}}.",
    trigger: "event",
    eventType: "program_published",
    isActive: true,
    isSystem: true,
  },
  {
    name: "Nouveau message",
    channel: "push",
    subject: "Nouveau message",
    content: "Vous avez reçu un nouveau message de votre coach.",
    trigger: "event",
    eventType: "message_new",
    isActive: true,
    isSystem: true,
  },
  {
    name: "Document partagé",
    channel: "push",
    subject: "Nouveau document",
    content: "Votre coach vient de partager un document avec vous.",
    trigger: "event",
    eventType: "drive_file_shared",
    isActive: true,
    isSystem: true,
  },
];
