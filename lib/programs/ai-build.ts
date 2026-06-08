import { db } from "@/lib/db";
import {
  blockExercises,
  exerciseBlocks,
  programMacrocycles,
  programMesocycles,
  programMicrocycles,
  programSessions,
  programs,
  programWeeks,
  setPrescriptions,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import type { ResolvedProgramDraft } from "@/lib/ai/schemas/program-draft";
import { getProgramTree } from "./service";
import type { ProgramTree } from "./types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertWeekTree(
  tx: Tx,
  organizationId: string,
  programId: string,
  microcycleId: string | null,
  weeks: ResolvedProgramDraft["weeks"],
) {
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex]!;

    const [newWeek] = await tx
      .insert(programWeeks)
      .values({
        organizationId,
        programId,
        microcycleId,
        sortOrder: weekIndex,
        label: week.label,
      })
      .returning({ id: programWeeks.id });

    for (
      let sessionIndex = 0;
      sessionIndex < week.sessions.length;
      sessionIndex++
    ) {
      const session = week.sessions[sessionIndex]!;

      const [newSession] = await tx
        .insert(programSessions)
        .values({
          organizationId,
          programWeekId: newWeek!.id,
          sortOrder: sessionIndex,
          name: session.name,
          dayOfWeek: session.dayOfWeek,
        })
        .returning({ id: programSessions.id });

      for (
        let blockIndex = 0;
        blockIndex < session.blocks.length;
        blockIndex++
      ) {
        const block = session.blocks[blockIndex]!;

        const [newBlock] = await tx
          .insert(exerciseBlocks)
          .values({
            organizationId,
            programSessionId: newSession!.id,
            sortOrder: blockIndex,
            type: block.type,
            sharedRestSeconds: block.sharedRestSeconds,
            rounds: block.rounds ?? (block.type === "circuit" ? 3 : null),
            restBetweenRoundsSeconds: block.restBetweenRoundsSeconds,
            durationSeconds:
              block.durationSeconds ?? (block.type === "amrap" ? 600 : null),
            targetRpe: block.targetRpe,
          })
          .returning({ id: exerciseBlocks.id });

        for (
          let exerciseIndex = 0;
          exerciseIndex < block.exercises.length;
          exerciseIndex++
        ) {
          const exercise = block.exercises[exerciseIndex]!;

          const [newBlockExercise] = await tx
            .insert(blockExercises)
            .values({
              organizationId,
              exerciseBlockId: newBlock!.id,
              exerciseId: exercise.exerciseId,
              sortOrder: exerciseIndex,
              notes: exercise.notes,
            })
            .returning({ id: blockExercises.id });

          if (exercise.prescriptions.length > 0) {
            await tx.insert(setPrescriptions).values(
              exercise.prescriptions.map((prescription) => ({
                organizationId,
                blockExerciseId: newBlockExercise!.id,
                setNumber: prescription.setNumber,
                load: prescription.load ?? null,
                reps: prescription.reps ?? null,
                restSeconds: prescription.restSeconds ?? null,
                tempo: prescription.tempo ?? null,
                rpe: prescription.rpe ?? null,
                durationSeconds: prescription.durationSeconds ?? null,
              })),
            );
          }
        }
      }
    }
  }
}

export async function buildProgramFromAiDraft(
  organizationId: string,
  coachClerkUserId: string,
  draft: ResolvedProgramDraft,
): Promise<ProgramTree> {
  const hasMesocycles = (draft.mesocycles?.length ?? 0) > 0;
  const hasWeeks = draft.weeks.length > 0;

  if (!hasMesocycles && !hasWeeks) {
    throw problem({
      type: "validation-error",
      title: "Empty program draft",
      status: 422,
      detail:
        "The AI draft did not produce any sessions with resolvable exercises.",
    });
  }

  const programId = await db.transaction(async (tx) => {
    const [program] = await tx
      .insert(programs)
      .values({
        organizationId,
        coachClerkUserId,
        name: draft.name,
        description: draft.description,
        status: "draft",
      })
      .returning({ id: programs.id });

    if (hasMesocycles) {
      for (
        let mesoIndex = 0;
        mesoIndex < (draft.mesocycles?.length ?? 0);
        mesoIndex++
      ) {
        const mesocycle = draft.mesocycles![mesoIndex]!;
        const [newMesocycle] = await tx
          .insert(programMesocycles)
          .values({
            organizationId,
            programId: program!.id,
            sortOrder: mesoIndex,
            name: mesocycle.name,
            focus: mesocycle.focus ?? null,
            targetDurationWeeks: mesocycle.targetDurationWeeks ?? null,
          })
          .returning({ id: programMesocycles.id });

        for (
          let macroIndex = 0;
          macroIndex < mesocycle.macrocycles.length;
          macroIndex++
        ) {
          const macrocycle = mesocycle.macrocycles[macroIndex]!;
          const [newMacrocycle] = await tx
            .insert(programMacrocycles)
            .values({
              organizationId,
              mesocycleId: newMesocycle!.id,
              sortOrder: macroIndex,
              name: macrocycle.name,
              focus: macrocycle.focus ?? null,
              targetDurationWeeks: macrocycle.targetDurationWeeks ?? null,
            })
            .returning({ id: programMacrocycles.id });

          for (
            let microIndex = 0;
            microIndex < macrocycle.microcycles.length;
            microIndex++
          ) {
            const microcycle = macrocycle.microcycles[microIndex]!;
            const [newMicrocycle] = await tx
              .insert(programMicrocycles)
              .values({
                organizationId,
                macrocycleId: newMacrocycle!.id,
                sortOrder: microIndex,
                name: microcycle.name,
                focus: microcycle.focus ?? null,
                targetDurationWeeks: microcycle.targetDurationWeeks ?? null,
              })
              .returning({ id: programMicrocycles.id });

            await insertWeekTree(
              tx,
              organizationId,
              program!.id,
              newMicrocycle!.id,
              microcycle.weeks,
            );
          }
        }
      }
    }

    if (hasWeeks) {
      await insertWeekTree(
        tx,
        organizationId,
        program!.id,
        null,
        draft.weeks,
      );
    }

    return program!.id;
  });

  return getProgramTree(organizationId, programId);
}
