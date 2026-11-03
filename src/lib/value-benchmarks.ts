import { z } from "zod";
import valueBenchmarksJson from "@/data/value-benchmarks.json";

// Cited, dated dollar figures used by the value engine. Every number lives in the JSON (not in
// code) and carries its own `source` + `asOf`, so the figures are auditable in one place and the
// engine never hard-codes a literal. Ranges only — these are illustrative estimates, never quotes.
const ValueBenchmarkSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  low: z.number().nonnegative(),
  high: z.number().nonnegative(),
  unit: z.literal("usd"),
  source: z.string().min(1),
  asOf: z.string().min(1),
  note: z.string().optional(),
});

export type ValueBenchmark = z.infer<typeof ValueBenchmarkSchema>;

function loadBenchmarks(): ValueBenchmark[] {
  const parsed = z.array(ValueBenchmarkSchema).safeParse(valueBenchmarksJson);
  if (!parsed.success) {
    throw new Error(`src/data/value-benchmarks.json failed validation: ${parsed.error.message}`);
  }
  return parsed.data;
}

const benchmarks = loadBenchmarks();
const benchmarksById: ReadonlyMap<string, ValueBenchmark> = new Map(
  benchmarks.map((benchmark) => [benchmark.id, benchmark]),
);

export function getBenchmark(id: string): ValueBenchmark {
  const benchmark = benchmarksById.get(id);
  if (!benchmark) {
    throw new Error(`Unknown value benchmark: ${id}`);
  }
  return benchmark;
}

export function listBenchmarks(): ValueBenchmark[] {
  return benchmarks;
}
