# DemoMed Healthcare API Assessment

This repository contains an assessment implementation for the DemoMed Healthcare API.

## What is included

- `assesment.md`: The assessment prompt, API details, scoring rules, and submission schema.
- `assessment_solution.py`: A Python implementation for the assessment.
- `package.json`, `tsconfig.json`, `src/assessment.ts`, `src/index.ts`: A TypeScript implementation that:
  - fetches all patients from `/api/patients`
  - handles retries, rate limits, and intermittent API failures
  - validates inconsistent BP / temperature / age data
  - computes risk scores according to the assessment rules
  - generates required alert lists
  - submits results to `/api/submit-assessment`

## TypeScript Usage

Install Node dependencies:

```bash
npm install
```

Create a local `.env` file using the provided example:

```bash
copy .env.example .env
```

Update `.env` with your API key and do not commit it into source control.

Fetch patient data and compute alert lists:

```bash
npm run fetch -- --limit 20 --output assessment_results.json
```

Fetch, compute, and submit the assessment result:

```bash
npm run submit -- --limit 20 --output assessment_results.json
```

The computed alert list is saved by default to `assessment_results.json`.

## Key details

- Authentication uses the API key from `assesment.md` by default.
- You can override it with the environment variable `DEMOMED_API_KEY`.
- The TypeScript solution supports page sizes from `1` to `20`.
- Malformed or missing BP, age, or temperature values are marked as data quality issues.

## Notes

- The TypeScript implementation is the recommended solution for this task, but the Python script remains available as a reference.
- React is not required for the core assessment; this solution uses TypeScript for strong typing and clean API integration.
