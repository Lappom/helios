import type { CreateQuestionnaireQuestionInput } from "@/lib/validators/questionnaires";

export const MAX_QUESTIONNAIRE_QUESTIONS = 20;

export const ONBOARDING_QUESTIONNAIRE_NAME = "Onboarding client";
export const WEEKLY_CHECKIN_QUESTIONNAIRE_NAME = "Check-in hebdomadaire";

export const DEFAULT_ONBOARDING_QUESTIONS: CreateQuestionnaireQuestionInput[] = [
  {
    type: "text",
    label: "Antécédents médicaux ou blessures récentes",
    required: true,
  },
  {
    type: "text",
    label: "Matériel disponible (haltères, élastiques, salle…)",
    required: false,
  },
  {
    type: "text",
    label: "Objectif principal",
    required: true,
  },
  {
    type: "scale",
    label: "Niveau d'activité actuel (1 = sédentaire, 10 = très actif)",
    required: true,
  },
  {
    type: "text",
    label: "Contraintes horaires ou préférences",
    required: false,
  },
];

export const DEFAULT_WEEKLY_QUESTIONS: CreateQuestionnaireQuestionInput[] = [
  {
    type: "scale",
    label: "Niveau d'énergie cette semaine",
    required: true,
  },
  {
    type: "scale",
    label: "Qualité du sommeil",
    required: true,
  },
  {
    type: "scale",
    label: "Niveau de stress",
    required: true,
  },
  {
    type: "boolean",
    label: "Douleur ou gêne signalée ?",
    required: true,
  },
  {
    type: "text",
    label: "Commentaire libre",
    required: false,
  },
];
