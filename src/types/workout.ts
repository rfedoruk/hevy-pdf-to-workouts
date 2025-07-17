export interface WorkoutProgram {
  title: string;
  description?: string;
  weeks: WorkoutWeek[];
}

export interface WorkoutWeek {
  weekNumber: number;
  title: string;
  workouts: WorkoutDay[];
}

export interface WorkoutDay {
  title: string;
  description?: string;
  exercises: Exercise[];
}

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
  notes?: string;
  restSeconds?: number;
}

export interface ExerciseSet {
  type: 'warmup' | 'normal' | 'failure' | 'dropset';
  reps?: number;
  repRange?: {
    min: number;
    max: number;
  };
  weight?: number;
  duration?: number;
  distance?: number;
  notes?: string;
}

export interface ExerciseMatch {
  exercise: Exercise;
  templateId: string;
  confidence: number;
  template: {
    id: string;
    title: string;
    type: string;
  };
}