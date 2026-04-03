Healthcare API Assessment
1. Assessment Context
API: DemoMed Healthcare API (a fictional system for coding evaluation)

Your Role: Demonstrate API integration and data processing skills.

Goal: Show how you handle real-world API challenges and data inconsistencies.

NOTE: This is simulated test data created specifically for assessment purposes only.

2. Your API Key
A unique API key has been automatically generated for this session. You will need this key to authenticate with the API endpoints.

Your API Key
ak_0c3ebd480cd6c6240da476cca12d27b39c74664c14399fa5

Authentication
All API requests require authentication using the x-api-key header:

Headers: { "x-api-key": "YOUR_API_KEY" }
3. API Information
Base URL: https://assessment.ksensetech.com/api

API Behavior (Important!)
This API simulates real-world conditions:

Rate limiting: May return 429 errors if you make requests too quickly.
Intermittent failures: ~8% chance of 500/503 errors (requires retry logic).
Pagination: Returns 5 patients per page by default (~10 pages, ~50 patients total).
Inconsistent responses: Occasionally returns data in different formats or with missing fields.
Endpoint Details
Retrieve patient list
GET /api/patients
Headers
x-api-key
string
required
API key for authentication and access control

Path parameters
page
string
optional
The page index.

Default:
1
limit
string
optional
How many resources to return in each list page. The default is 5, and the maximum is 20.

Default:
5
Example Usage:

json

Copy
curl -X GET "https://assessment.ksensetech.com/api/patients?page=1&limit=10"
  -H "x-api-key: your-api-key-here"
  
Response

Copy
{
  "data": [
    {
      "patient_id": "DEMO001",
      "name": "TestPatient, John",
      "age": 45,
      "gender": "M",
      "blood_pressure": "120/80",
      "temperature": 98.6,
      "visit_date": "2024-01-15",
      "diagnosis": "Sample_Hypertension",
      "medications": "DemoMed_A 10mg, TestDrug_B 500mg"
    },
    {
      "patient_id": "DEMO002",
      "name": "AssessmentUser, Jane",
      "age": 67,
      "gender": "F",
      "blood_pressure": "140/90",
      "temperature": 99.2,
      "visit_date": "2024-01-16",
      "diagnosis": "Eval_Diabetes",
      "medications": "FakeMed 1000mg"
    },
    // ... more patients
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 50,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  },
  "metadata": {
    "timestamp": "2025-07-15T23:01:05.059Z",
    "version": "v1.0",
    requestId: "123"
  }
}
4. Your Task: Implement Risk Scoring
Create a patient risk scoring system. The total risk is the sum of scores from each category.

Blood Pressure Risk
Note: If systolic and diastolic readings fall into different risk categories, use the higher risk stage for scoring.

Normal (Systolic <120 AND Diastolic <80): 1 points
Elevated (Systolic 120‑129 AND Diastolic <80): 2 points
Stage 1 (Systolic 130‑139 OR Diastolic 80‑89): 3 points
Stage 2 (Systolic ≥140 OR Diastolic ≥90): 4 points
Invalid/Missing Data (0 points):
• Missing systolic or diastolic values (e.g., "150/" or "/90")
• Non-numeric values (e.g., "INVALID", "N/A")
• Null, undefined, or empty values
Temperature Risk
Normal (≤99.5°F): 0 points
Low Fever (99.6-100.9°F): 1 point
High Fever (≥‮0.101‬°F): 2 points
Invalid/Missing Data (0 points):
• Non-numeric values (e.g., "TEMP_ERROR", "invalid")
• Null, undefined, or empty values
Age Risk
Under 40 (<40 years): 1 points
40-65 (40-65 years, inclusive): 1 point
Over 65 (>65 years): 2 points
Invalid/Missing Data (0 points):
• Null, undefined, or empty values
• Non-numeric strings (e.g., "fifty-three", "unknown")
Total Risk Score = (BP Score) + (Temp Score) + (Age Score)

5. Required Outputs
Your solution should be able to produce these outputs based on your data analysis.

Alert Lists: Your system should identify patients who meet specific criteria:
High-Risk Patients: Patient IDs with total risk score ≥ 4
Fever Patients: Patient IDs with temperature ≥ 99.6°F
Data Quality Issues: Patient IDs with invalid/missing data (e.g., BP, Age, or Temp is missing/malformed)
6. Deliverables & Submission
You must submit your results by making a POST request to the assessment API.

📝 Submission Attempts
You have 3 attempts to submit your assessment. Each submission provides immediate feedback to help you improve your score.

Submit Alert List
POST /api/submit-assessment
Headers
x-api-key
string
required
API key for authentication and access control

Request body parameters
Encoding type:
application/json
Schema
Example
high_risk_patients
string[]
required
Array of patient IDs with total risk score ≥ 4.

fever_patients
string[]
required
Array of patient IDs with temperature ≥ 99.6°F.

data_quality_issues
string[]
required
Array of patient IDs with invalid/missing data.

How to Submit (Examples)
curl
JavaScript
bash

Copy
curl -X POST https://assessment.ksensetech.com/api/submit-assessment \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "high_risk_patients": ["DEMO002", "DEMO031"],
    "fever_patients": ["DEMO005", "DEMO021"],
    "data_quality_issues": ["DEMO004", "DEMO007"]
  }'
Response

Copy

  {
  "success": true,
  "message": "Assessment submitted successfully",
  "results": {
    "score": 91.94,
    "percentage": 92,
    "status": "PASS",
    "breakdown": {
      "high_risk": {
        "score": 48,
        "max": 50,
        "correct": 20,
        "submitted": 21,
        "matches": 20
      },
      "fever": {
        "score": 19,
        "max": 25,
        "correct": 9,
        "submitted": 7,
        "matches": 7
      },
      "data_quality": {
        "score": 25,
        "max": 25,
        "correct": 8,
        "submitted": 8,
        "matches": 8
      }
    },
    "feedback": {
      "strengths": [
        "✅ Data quality issues: Perfect score (8/8)"
      ],
      "issues": [
        "🔄 High-risk patients: 20/20 correct, but 1 incorrectly included",
        "🔄 Fever patients: 7/9 correct, but 2 missed"
      ]
    },
    "attempt_number": 1,
    "remaining_attempts": 2,
    "is_personal_best": true,
    "can_resubmit": true
  }
}
7. Submit Your Code Repository
Once you have completed the coding challenge, please provide the URL to your code repository below to finish the assessment and view your final score.