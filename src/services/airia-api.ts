import { readFileSync } from 'fs';
import { read, utils } from 'xlsx';
import type { WorkoutProgram } from '../types/workout.js';

export class AiriaApiClient {
  private apiKey: string;
  private pipelineId: string;
  private baseUrl = 'https://dev.api.airiadev.ai';

  constructor(apiKey: string, pipelineId: string) {
    this.apiKey = apiKey;
    this.pipelineId = pipelineId;
  }

  async extractWorkoutFromExcel(excelPath: string): Promise<WorkoutProgram> {
    // Read and parse Excel file
    const fileBuffer = readFileSync(excelPath);
    const workbook = read(fileBuffer, { type: 'buffer' });
    const excelData = this.parseExcelWorkbook(workbook);

    return this.retryAiriaRequest(async () => {
      return this.makeAiriaRequest(excelData);
    });
  }

  private async makeAiriaRequest(excelData: any): Promise<WorkoutProgram> {
    // Step 1: Create pipeline execution using v2 API with correct structure
    
    const requestPayload = {
      userInput: `Extract workout information from this Excel data and return it as a structured JSON object.

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

Excel Data:
${JSON.stringify(excelData, null, 2)}`,
      debug: false,
      userId: null,
      conversationId: null
    };

    const executionResponse = await fetch(`${this.baseUrl}/v2/PipelineExecution/${this.pipelineId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': `${this.apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    });
    console

    if (!executionResponse.ok) {
      const error = await executionResponse.text();
      throw new Error(`Airia API error (${executionResponse.status}): ${error}`);
    }

    const execution = await executionResponse.json() as any;
    
    // V2 API returns different structure - check for executionId in the response
    if (!execution.executionId && !execution.id) {
      throw new Error('Invalid Airia API response: missing execution ID');
    }
    
    const executionId = execution.executionId || execution.id;

    // Step 2: Poll for completion
    return this.pollForCompletion(executionId);
  }

  private async pollForCompletion(executionId: string): Promise<WorkoutProgram> {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.baseUrl}/PipelineExecution/${executionId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': `${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Airia API error (${response.status}): ${error}`);
      }

      const execution = await response.json() as any;
      
      // Check different possible status field names
      const status = execution.status || execution.state || execution.executionStatus;
      
      if (status === 'completed' || status === 'success' || status === 'finished') {
        // Parse the result - try different possible output field names
        const result = execution.result || execution.output || execution.outputs || execution.data;
        
        try {
          let workoutData;
          if (typeof result === 'string') {
            workoutData = JSON.parse(result);
          } else {
            workoutData = result;
          }
          return workoutData as WorkoutProgram;
        } catch (error) {
          throw new Error(`Failed to parse Airia response as JSON: ${JSON.stringify(result)}`);
        }
      } else if (status === 'failed' || status === 'error') {
        const errorMsg = execution.error || execution.errorMessage || execution.message || 'Unknown error';
        throw new Error(`Pipeline execution failed: ${errorMsg}`);
      } else if (status === 'running' || status === 'pending' || status === 'in_progress') {
        // Still running, continue polling
        console.log(`Pipeline execution ${status}... (${attempts + 1}/${maxAttempts})`);
      }

      // Wait 10 seconds before next poll
      await this.sleep(10000);
      attempts++;
    }

    throw new Error('Pipeline execution timed out after 5 minutes');
  }

  private async retryAiriaRequest<T>(
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
            console.log(`⚠ Airia API overloaded. Retrying in ${delay/1000}s... (attempt ${attempt}/${maxRetries})`);
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

    // Parse each sheet with smart sampling
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers
      const jsonData = utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false 
      });

      // Sample the data if it's too large
      const sampledData = this.sampleSheetData(jsonData);
      const sampledFormatted = this.sampleSheetData(
        utils.sheet_to_json(worksheet, { defval: '' })
      );

      result.sheets[sheetName] = {
        name: sheetName,
        data: sampledData,
        formatted: sampledFormatted,
        originalRowCount: jsonData.length,
        wasSampled: sampledData.length < jsonData.length
      };
    }

    return result;
  }

  private sampleSheetData(data: any[]): any[] {
    if (data.length <= 100) {
      return data; // Small enough, no sampling needed
    }

    // For large sheets, take:
    // - First 20 rows (headers and early data)
    // - Every 10th row from the middle (pattern sampling)
    // - Last 10 rows (final data)
    
    const sampled = [];
    
    // First 20 rows
    sampled.push(...data.slice(0, 20));
    
    // Sample from middle (every 10th row)
    const middleStart = 20;
    const middleEnd = data.length - 10;
    for (let i = middleStart; i < middleEnd; i += 10) {
      sampled.push(data[i]);
    }
    
    // Last 10 rows
    sampled.push(...data.slice(-10));
    
    return sampled;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by trying to get pipeline executions (should return 401 if auth fails, or valid data if successful)
      const response = await fetch(`${this.baseUrl}/v1/PipelinesConfig/${this.pipelineId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': `${this.apiKey}`,
        },
      });
      console.log("api key: ", this.apiKey);


      // Return true if we get 200 (success) or 404 (no executions found but auth worked)
      return response.status === 200 || response.status === 404;
    } catch (error) {
      return false;
    }
  }
}