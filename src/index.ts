import { promises as fs } from "fs";
import path from "path";
import {
  API_KEY,
  AssessmentResults,
  fetchAllPatients,
  validateApiKey,
  classifyPatients,
  submitAssessment,
} from "./assessment";

interface CliOptions {
  fetch: boolean;
  submit: boolean;
  limit: number;
  output: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const getArg = (name: string, defaultValue: string): string => {
    const index = args.findIndex((arg) => arg === name);
    if (index >= 0 && index + 1 < args.length) {
      return args[index + 1];
    }
    return defaultValue;
  };

  return {
    fetch: args.includes("--fetch"),
    submit: args.includes("--submit"),
    limit: Math.min(Math.max(Number(getArg("--limit", "20")), 1), 20),
    output: getArg("--output", "assessment_results.json"),
  };
}

function printHelp(): void {
  console.log(`Usage: npm run fetch -- [--limit <1-20>] [--output <file>]
Usage: npm run submit -- [--limit <1-20>] [--output <file>]

Options:
  --fetch          Fetch patient data and compute alert lists
  --submit         Fetch patient data, compute alert lists, and submit the result
  --limit <n>      Page size for patient retrieval (default: 20, max: 20)
  --output <file>  Output file for the computed result (default: assessment_results.json)
`);
}

async function main(): Promise<number> {
  const options = parseArgs();
  if (!options.fetch && !options.submit) {
    printHelp();
    return 1;
  }

  validateApiKey();

  console.log("Fetching patient data...");
  const patients = await fetchAllPatients(options.limit);
  console.log(`Fetched ${patients.length} patient records.`);

  const results: AssessmentResults = classifyPatients(patients);

  const outputPath = path.resolve(process.cwd(), options.output);
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`Computed results written to ${outputPath}`);

  console.log(JSON.stringify(results, null, 2));

  if (options.submit) {
    console.log("Submitting assessment...");
    const response = await submitAssessment(results);
    console.log("Submission result:");
    console.log(JSON.stringify(response, null, 2));
  }

  return 0;
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
