import { readFileSync } from 'fs';
import { read, utils } from 'xlsx';
import type { WorkoutProgram } from '../types/workout.js';

export class ClaudeApiClient {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractWorkoutFromExcel(excelPath: string): Promise<WorkoutProgram> {
    // Read and parse Excel file
    const fileBuffer = readFileSync(excelPath);
    const workbook = read(fileBuffer, { type: 'buffer' });
    const excelData = this.parseExcelWorkbook(workbook);

    return this.retryClaudeRequest(async () => {
      return this.makeClaudeRequest(excelData);
    });
  }

  private async makeClaudeRequest(excelData: any): Promise<WorkoutProgram> {
    const prompt = `
Extract workout information from this Excel data and return it as a structured JSON object.

The Excel data contains a workout program. Please analyze it and extract:
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

Return ONLY the JSON object, no other text.

Here is the Excel data:
${JSON.stringify(excelData, null, 2)}`;

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
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error (${response.status}): ${error}`);
    }

    const result = await response.json() as any;
    const content = result.content[0].text;

    try {
      // Parse the JSON response
      const workoutData = JSON.parse(content);
      return workoutData as WorkoutProgram;
    } catch (error) {
      throw new Error(`Failed to parse Claude response as JSON: ${content}`);
    }
  }

  private async retryClaudeRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a retryable error (overloaded, rate limit, etc.)
        if (this.isRetryableError(error as Error)) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`⚠ Claude API overloaded. Retrying in ${delay/1000}s... (attempt ${attempt}/${maxRetries})`);
            await this.sleep(delay);
            continue;
          }
        }
        
        // Non-retryable error or max retries reached
        throw error;
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('overloaded') ||
      message.includes('529') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('rate limit')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseExcelWorkbook(workbook: any): any {
    const result: any = {
      sheets: {},
      sheetNames: workbook.SheetNames,
    };

    // Parse each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers
      const jsonData = utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false 
      });

      result.sheets[sheetName] = {
        name: sheetName,
        data: jsonData,
        // Also include formatted version for easier parsing
        formatted: utils.sheet_to_json(worksheet, { defval: '' })
      };
    }

    return result;
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