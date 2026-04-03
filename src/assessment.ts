import axios, { AxiosError } from "axios";

export const BASE_URL = "https://assessment.ksensetech.com/api";
export const API_KEY = process.env.DEMOMED_API_KEY ?? "ak_0c3ebd480cd6c6240da476cca12d27b39c74664c14399fa5";

export interface PatientRecordRaw {
  patient_id?: string;
  name?: string;
  age?: string | number | null;
  gender?: string;
  blood_pressure?: string | null;
  temperature?: string | number | null;
  visit_date?: string;
  diagnosis?: string;
  medications?: string;
  [key: string]: unknown;
}

export interface AssessmentResults {
  high_risk_patients: string[];
  fever_patients: string[];
  data_quality_issues: string[];
}

interface PatientsResponse {
  data: PatientRecordRaw[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
  metadata?: Record<string, unknown>;
}

const HEADERS = {
  "x-api-key": API_KEY,
  "Content-Type": "application/json",
};

const MAX_RETRIES = 8;
const RETRY_BACKOFF_MS = 1500;
const PAGE_REQUEST_DELAY_MS = 500;

function isValidId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeString(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function parseInteger(value: unknown): number | null {
  const normalized = normalizeString(value);
  if (normalized === "") {
    return null;
  }
  const parsed = Number(normalized);
  if (Number.isFinite(parsed) && Number.isInteger(parsed)) {
    return parsed;
  }
  return null;
}

function parseFloatValue(value: unknown): number | null {
  const normalized = normalizeString(value);
  if (normalized === "") {
    return null;
  }
  const parsed = Number(normalized);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return null;
}

export async function sendRequest<T>(
  method: "GET" | "POST",
  path: string,
  params?: Record<string, unknown>,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt += 1;
    try {
      const response = await axios.request<T>({
        method,
        url,
        headers: HEADERS,
        params,
        data: body,
        timeout: 15000,
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
        if (attempt >= MAX_RETRIES) {
          const retryAfter = axiosError.response?.headers?.["retry-after"];
          throw new Error(`Request failed after ${attempt} attempts${retryAfter ? `, retry-after=${retryAfter}` : ""}: ${axiosError.message}`);
        }

        const retryAfterHeader = axiosError.response?.headers?.["retry-after"];
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const waitTime = Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : RETRY_BACKOFF_MS * attempt;

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (axiosError.response) {
        throw new Error(`HTTP ${status}: ${JSON.stringify(axiosError.response.data)}`);
      }

      throw new Error(`Request error: ${axiosError.message}`);
    }
  }

  throw new Error("Exceeded retry limit");
}

export async function fetchPatientsPage(page: number, limit: number): Promise<PatientsResponse> {
  return sendRequest<PatientsResponse>("GET", "/patients", { page, limit });
}

async function fetchPatientsPageWithRetry(page: number, limit: number): Promise<PatientsResponse> {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt += 1;
    const payload = await fetchPatientsPage(page, limit);
    if (Array.isArray(payload.data)) {
      return payload;
    }

    const errorMessage = payload && typeof payload === "object" ? JSON.stringify(payload) : String(payload);
    if (attempt >= MAX_RETRIES) {
      throw new Error(`Missing patients array on page ${page} after ${attempt} attempts: ${errorMessage}`);
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * attempt));
  }
  throw new Error(`Missing patients array on page ${page} after ${MAX_RETRIES} attempts`);
}

export async function fetchAllPatients(limit: number): Promise<PatientRecordRaw[]> {
  const records: PatientRecordRaw[] = [];
  let page = 1;

  while (true) {
    const payload = await fetchPatientsPageWithRetry(page, limit);
    records.push(...payload.data);

    const pagination = payload.pagination ?? {};
    if (pagination.hasNext === false) {
      break;
    }

    if (pagination.hasNext === true) {
      page += 1;
      await new Promise((resolve) => setTimeout(resolve, PAGE_REQUEST_DELAY_MS));
      continue;
    }

    const totalPages = pagination.totalPages;
    if (typeof totalPages === "number") {
      if (page >= totalPages) {
        break;
      }
      page += 1;
      await new Promise((resolve) => setTimeout(resolve, PAGE_REQUEST_DELAY_MS));
      continue;
    }

    if (payload.data.length === 0) {
      break;
    }

    page += 1;
    await new Promise((resolve) => setTimeout(resolve, PAGE_REQUEST_DELAY_MS));
  }

  return records;
}

export function parseBloodPressure(value: unknown): [number, number] | null {
  const text = normalizeString(value);
  if (text === "") {
    return null;
  }

  const parts = text.split("/").map((part) => part.trim());
  if (parts.length !== 2) {
    return null;
  }

  const systolic = parseInteger(parts[0]);
  const diastolic = parseInteger(parts[1]);
  if (systolic === null || diastolic === null) {
    return null;
  }

  return [systolic, diastolic];
}

export function computeBpScore(bp: [number, number] | null): number {
  if (bp === null) {
    return 0;
  }

  const [systolic, diastolic] = bp;

  // Compute each reading's stage independently, then take the higher (per spec)
  let sysScore: number;
  if (systolic < 120)      sysScore = 1; // Normal
  else if (systolic < 130) sysScore = 2; // Elevated
  else if (systolic < 140) sysScore = 3; // Stage 1
  else                     sysScore = 4; // Stage 2

  // Diastolic has no "Elevated" category on its own
  let diaScore: number;
  if (diastolic < 80)      diaScore = 1; // Normal
  else if (diastolic < 90) diaScore = 3; // Stage 1
  else                     diaScore = 4; // Stage 2

  return Math.max(sysScore, diaScore);
}

export function computeTemperatureScore(value: unknown): number {
  const temperature = parseFloatValue(value);
  if (temperature === null) {
    return 0;
  }

  if (temperature <= 99.5) {
    return 0;
  }
  if (temperature >= 99.6 && temperature <= 100.9) {
    return 1;
  }
  if (temperature >= 101.0) {
    return 2;
  }

  return 0;
}

export function computeAgeScore(value: unknown): number {
  const age = parseInteger(value);
  if (age === null) {
    return 0;
  }

  if (age < 40) {
    return 1;
  }
  if (age <= 65) {
    return 1;
  }
  return 2;
}

export function classifyPatients(records: PatientRecordRaw[]): AssessmentResults {
  const highRisk: Set<string> = new Set();
  const fever: Set<string> = new Set();
  const quality: Set<string> = new Set();

  for (const raw of records) {
    const patientId = normalizeString(raw.patient_id);
    if (patientId === "") {
      continue;
    }

    const bp = parseBloodPressure(raw.blood_pressure);
    const temperature = parseFloatValue(raw.temperature);
    const age = parseInteger(raw.age);

    if (bp === null || temperature === null || age === null) {
      quality.add(patientId);
    }

    if (temperature !== null && temperature >= 99.6) {
      fever.add(patientId);
    }

    const totalScore = computeBpScore(bp) + computeTemperatureScore(temperature) + computeAgeScore(age);
    if (totalScore >= 4) {
      highRisk.add(patientId);
    }
  }

  return {
    high_risk_patients: Array.from(highRisk).sort(),
    fever_patients: Array.from(fever).sort(),
    data_quality_issues: Array.from(quality).sort(),
  };
}

export async function submitAssessment(results: AssessmentResults): Promise<Record<string, unknown>> {
  return sendRequest<Record<string, unknown>>("POST", "/submit-assessment", undefined, results);
}

export function validateApiKey(): void {
  if (!isValidId(API_KEY)) {
    throw new Error("Missing DEMOMED_API_KEY environment variable or hardcoded API key.");
  }
}
