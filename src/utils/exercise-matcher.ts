import Fuse from 'fuse.js';
import type { ExerciseTemplate } from '../types/hevy.js';
import type { Exercise, ExerciseMatch } from '../types/workout.js';

export class ExerciseMatcher {
  private fuse: Fuse<ExerciseTemplate>;
  private templates: ExerciseTemplate[];

  constructor(templates: ExerciseTemplate[]) {
    this.templates = templates;
    this.fuse = new Fuse(templates, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'primary_muscle_group', weight: 0.2 },
        { name: 'secondary_muscle_groups', weight: 0.1 },
      ],
      threshold: 0.4, // Lower = more strict matching
      distance: 100,
    });
  }

  findBestMatch(exercise: Exercise): ExerciseMatch | null {
    const results = this.fuse.search(exercise.name);
    
    if (results.length === 0) {
      return null;
    }

    const bestResult = results[0];
    const confidence = 1 - bestResult.score!;

    return {
      exercise,
      templateId: bestResult.item.id,
      confidence,
      template: {
        id: bestResult.item.id,
        title: bestResult.item.title,
        type: bestResult.item.type,
      },
    };
  }

  findMatches(exercise: Exercise, limit: number = 5): ExerciseMatch[] {
    const results = this.fuse.search(exercise.name, { limit });
    
    return results.map(result => ({
      exercise,
      templateId: result.item.id,
      confidence: 1 - result.score!,
      template: {
        id: result.item.id,
        title: result.item.title,
        type: result.item.type,
      },
    }));
  }

  getAllTemplates(): ExerciseTemplate[] {
    return this.templates;
  }

  getTemplateById(id: string): ExerciseTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  // Normalize exercise names for better matching
  static normalizeExerciseName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Get exercises grouped by muscle group for better organization
  getExercisesByMuscleGroup(): Record<string, ExerciseTemplate[]> {
    const grouped: Record<string, ExerciseTemplate[]> = {};
    
    for (const template of this.templates) {
      const muscleGroup = template.primary_muscle_group || 'Other';
      if (!grouped[muscleGroup]) {
        grouped[muscleGroup] = [];
      }
      grouped[muscleGroup].push(template);
    }

    return grouped;
  }
}