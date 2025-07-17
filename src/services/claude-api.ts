import { readFileSync } from 'fs';
import type { WorkoutProgram } from '../types/workout.js';

export class ClaudeApiClient {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractWorkoutFromPdf(pdfPath: string): Promise<WorkoutProgram> {
    // Read PDF file as base64
    const pdfBuffer = readFileSync(pdfPath);
    const base64Pdf = pdfBuffer.toString('base64');

    const prompt = `
Extract workout information from this PDF and return it as a structured JSON object.

The PDF contains a workout program. Please analyze it and extract:
1. Program title and description
2. Weekly structure (weeks 1-12)
3. Each workout day with exercises
4. Sets, reps, and any other exercise details

Return the data in this exact JSON format:
{
  "title": "Program Name",
  "description": "Program description if available",
  "weeks": [
    {
      "weekNumber": 1,
      "title": "Week 1",
      "workouts": [
        {
          "title": "Day 1 - Push",
          "description": "Optional workout description",
          "exercises": [
            {
              "name": "Bench Press",
              "sets": [
                {
                  "type": "normal",
                  "reps": 8,
                  "repRange": { "min": 8, "max": 12 }
                }
              ],
              "notes": "Optional exercise notes",
              "restSeconds": 90
            }
          ]
        }
      ]
    }
  ]
}

Important notes:
- Use "normal" for set type unless specified as warmup/failure/dropset
- Include rep ranges if specified (e.g., "8-12 reps")
- Extract rest periods if mentioned
- Group exercises by workout day
- Maintain the week structure (1-12)
- Be consistent with exercise names (use standard naming)

Return ONLY the JSON object, no other text.`;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Pdf,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error (${response.status}): ${error}`);
    }

    const result = await response.json();
    const content = result.content[0].text;

    try {
      // Parse the JSON response
      const workoutData = JSON.parse(content);
      return workoutData as WorkoutProgram;
    } catch (error) {
      throw new Error(`Failed to parse Claude response as JSON: ${content}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Test connection',
            },
          ],
        }),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}