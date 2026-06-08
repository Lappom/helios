"use client";

import type { AssessmentCompareResult } from "@/lib/assessments/types";
import { assessmentPhotoUrl } from "@/lib/assessments/api-client";
import { AssessmentWeightChart } from "@/components/coach/assessments/assessment-weight-chart";
import { cn } from "@/lib/utils";

type AssessmentCompareViewProps = {
  compare: AssessmentCompareResult;
};

export function AssessmentCompareView({ compare }: AssessmentCompareViewProps) {
  return (
    <div className="space-y-6">
      <AssessmentWeightChart data={compare.weightHistory} />

      {compare.measurementDeltas.length > 0 ? (
        <section className="border-hairline bg-surface-card rounded-lg border p-6">
          <h2 className="text-title-md text-on-dark mb-4 font-semibold">
            Évolution des mesures
          </h2>
          <div className="space-y-2">
            {compare.measurementDeltas.map((delta) => (
              <div
                key={delta.key}
                className="border-hairline flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
              >
                <span className="text-muted text-sm">{delta.label}</span>
                <div className="text-on-dark text-sm font-medium">
                  {delta.previous ?? "—"} → {delta.current ?? "—"}
                  {delta.delta !== null ? (
                    <span
                      className={cn(
                        "ml-2 font-bold",
                        delta.delta < 0 ? "text-primary" : "text-body",
                      )}
                    >
                      ({delta.delta > 0 ? "+" : ""}
                      {delta.delta.toFixed(1)})
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {compare.photoPairs.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-title-md text-on-dark font-semibold">
            Photos comparées
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {compare.photoPairs.map((pair) => {
              const currentResponse = compare.current?.responses.find(
                (response) => response.fieldId === pair.fieldId,
              );
              const previousResponse = compare.previous?.responses.find(
                (response) => response.fieldId === pair.fieldId,
              );

              return (
                <article
                  key={pair.fieldId}
                  className="border-hairline bg-surface-card rounded-lg border p-4"
                >
                  <h3 className="text-title-sm text-on-dark mb-3 font-semibold">
                    {pair.label}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-muted mb-2 text-xs uppercase">
                        Précédent
                      </p>
                      {previousResponse && compare.previous ? (
                        <img
                          src={assessmentPhotoUrl(
                            compare.previous.id,
                            previousResponse.id,
                          )}
                          alt={`${pair.label} précédent`}
                          className="bg-surface-elevated aspect-[3/4] w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="bg-surface-elevated text-muted flex aspect-[3/4] items-center justify-center rounded-md text-xs">
                          —
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-muted mb-2 text-xs uppercase">
                        Actuel
                      </p>
                      {currentResponse && compare.current ? (
                        <img
                          src={assessmentPhotoUrl(
                            compare.current.id,
                            currentResponse.id,
                          )}
                          alt={`${pair.label} actuel`}
                          className="bg-surface-elevated aspect-[3/4] w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="bg-surface-elevated text-muted flex aspect-[3/4] items-center justify-center rounded-md text-xs">
                          —
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
