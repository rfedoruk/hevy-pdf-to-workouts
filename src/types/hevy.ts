export interface ExerciseTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  is_custom: boolean;
}

export interface RoutineFolder {
  id: number;
  index: number;
  title: string;
  updated_at: string;
  created_at: string;
}

export interface PostRoutineFolderRequest {
  routine_folder: {
    title: string;
  };
}

export interface PostRoutineRequest {
  routine: {
    title: string;
    folder_id: number | null;
    notes: string;
    exercises: PostRoutineExercise[];
  };
}

export interface PostRoutineExercise {
  exercise_template_id: string;
  superset_id: number | null;
  rest_seconds: number | null;
  notes: string | null;
  sets: PostRoutineSet[];
}

export interface PostRoutineSet {
  type: 'warmup' | 'normal' | 'failure' | 'dropset';
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  custom_metric: number | null;
  rep_range: {
    start: number | null;
    end: number | null;
  } | null;
}

export interface HevyApiResponse<T> {
  page?: number;
  page_count?: number;
  exercise_templates?: T[];
  routine_folders?: T[];
  routines?: T[];
}