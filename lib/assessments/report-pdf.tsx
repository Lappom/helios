import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { AssessmentDetail, MeasurementDelta } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#0a0a0a",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#555555",
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e6e6e6",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  label: { color: "#555555" },
  value: { fontWeight: "bold" },
  alert: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: "#888888",
    textAlign: "center",
  },
});

type AssessmentReportDocumentProps = {
  assessment: AssessmentDetail;
  measurementDeltas?: MeasurementDelta[];
};

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AssessmentReportDocument({
  assessment,
  measurementDeltas = [],
}: AssessmentReportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Rapport de bilan</Text>
        <Text style={styles.subtitle}>
          {assessment.templateName} · {assessment.clientName}
        </Text>
        <Text style={styles.subtitle}>
          Soumis le {formatDate(assessment.submittedAt)}
        </Text>

        {assessment.hasCriticalAlert && assessment.criticalSummary ? (
          <View style={styles.alert}>
            <Text>{assessment.criticalSummary}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mesures et réponses</Text>
          {assessment.responses.map((response) => {
            let display = "—";
            if (response.textValue) {
              display = response.textValue;
            } else if (response.numberValue !== null) {
              display = String(response.numberValue);
            } else if (response.jsonValue) {
              display = Object.entries(response.jsonValue)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ");
            } else if (response.photoBlobPath) {
              display = "Photo jointe";
            }

            return (
              <View key={response.id} style={styles.row}>
                <Text style={styles.label}>{response.field.label}</Text>
                <Text style={styles.value}>{display}</Text>
              </View>
            );
          })}
        </View>

        {measurementDeltas.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Évolution vs bilan précédent</Text>
            {measurementDeltas.map((delta) => (
              <View key={delta.key} style={styles.row}>
                <Text style={styles.label}>{delta.label}</Text>
                <Text style={styles.value}>
                  {delta.previous ?? "—"} → {delta.current ?? "—"}
                  {delta.delta !== null
                    ? ` (${delta.delta > 0 ? "+" : ""}${delta.delta.toFixed(1)})`
                    : ""}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {assessment.coachNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes coach</Text>
            <Text>{assessment.coachNotes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>Généré par Helios · helios.lappom.fr</Text>
      </Page>
    </Document>
  );
}
