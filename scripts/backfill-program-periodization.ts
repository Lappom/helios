import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { backfillProgramPeriodization } = await import(
    "../lib/programs/backfill-periodization"
  );

  const result = await backfillProgramPeriodization();
  console.log(
    `Backfill complete: ${result.programsProcessed} programs migrated, ${result.programsSkipped} skipped, ${result.weeksLinked} weeks linked.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
