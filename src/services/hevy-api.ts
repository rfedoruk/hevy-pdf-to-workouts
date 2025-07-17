import type {
  ExerciseTemplate,
  RoutineFolder,
  PostRoutineFolderRequest,
  PostRoutineRequest,
  HevyApiResponse
} from '../types/hevy.js';

export class HevyApiClient {
  private baseUrl = 'https://api.hevyapp.com/v1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hevy API error (${response.status}): ${errorText}`);
    }

    return response.json() as T;
  }

  async getAllExerciseTemplates(): Promise<ExerciseTemplate[]> {
    const templates: ExerciseTemplate[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.makeRequest<HevyApiResponse<ExerciseTemplate>>(
        `/exercise_templates?page=${page}&pageSize=100`
      );

      if (response.exercise_templates) {
        templates.push(...response.exercise_templates);
      }

      hasMore = page < (response.page_count || 1);
      page++;
    }

    return templates;
  }

  async createRoutineFolder(title: string): Promise<RoutineFolder> {
    const request: PostRoutineFolderRequest = {
      routine_folder: { title }
    };

    return this.makeRequest<RoutineFolder>('/routine_folders', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async createRoutine(routine: PostRoutineRequest): Promise<any> {
    return this.makeRequest('/routines', {
      method: 'POST',
      body: JSON.stringify(routine),
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/workouts/count');
      return true;
    } catch (error) {
      return false;
    }
  }
}