import { existsSync } from 'fs';
import inquirer from 'inquirer';
import { ConfigManager } from '../services/config.js';
import { HevyApiClient } from '../services/hevy-api.js';
import { ClaudeApiClient } from '../services/claude-api.js';
import { ExerciseMatcher } from '../utils/exercise-matcher.js';
import { logger } from '../utils/logger.js';
import type { WorkoutProgram, ExerciseMatch } from '../types/workout.js';
import type { PostRoutineRequest, PostRoutineExercise, PostRoutineSet } from '../types/hevy.js';

export async function importCommand(pdfPath: string, options: { preview?: boolean } = {}): Promise<void> {
  const config = new ConfigManager();

  // Check if APIs are configured
  if (!config.hasRequiredKeys()) {
    logger.error('API keys not configured. Please run: hevy-importer setup');
    return;
  }

  // Check if PDF file exists
  if (!existsSync(pdfPath)) {
    logger.error(`PDF file not found: ${pdfPath}`);
    return;
  }

  logger.header(options.preview ? '👀 Preview Workout Import' : '📥 Import Workout to Hevy');

  try {
    // Initialize API clients
    const hevyClient = new HevyApiClient(config.getHevyApiKey()!);
    const claudeClient = new ClaudeApiClient(config.getClaudeApiKey()!);

    // Step 1: Extract workout from PDF
    logger.startSpinner('Extracting workout data from PDF...');
    const workoutProgram = await claudeClient.extractWorkoutFromPdf(pdfPath);
    logger.succeedSpinner(`Extracted: ${workoutProgram.title}`);

    // Step 2: Fetch exercise templates
    logger.startSpinner('Fetching Hevy exercise templates...');
    const templates = await hevyClient.getAllExerciseTemplates();
    logger.succeedSpinner(`Found ${templates.length} exercise templates`);

    // Step 3: Match exercises to templates
    logger.startSpinner('Matching exercises to templates...');
    const matcher = new ExerciseMatcher(templates);
    const allMatches = await matchAllExercises(workoutProgram, matcher);
    logger.succeedSpinner(`Matched ${allMatches.size} unique exercises`);

    // Preview mode - show what would be imported
    if (options.preview) {
      showPreview(workoutProgram, allMatches);
      return;
    }

    // Step 4: Confirm import
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Import "${workoutProgram.title}" to Hevy?`,
        default: true,
      },
    ]);

    if (!confirm) {
      logger.info('Import cancelled');
      return;
    }

    // Step 5: Create routine folder
    logger.startSpinner('Creating routine folder...');
    const folder = await hevyClient.createRoutineFolder(workoutProgram.title);
    logger.succeedSpinner(`Created folder: ${folder.title}`);

    // Step 6: Create routines for each week
    const totalWeeks = workoutProgram.weeks.length;
    let createdRoutines = 0;

    for (const week of workoutProgram.weeks) {
      for (const workout of week.workouts) {
        logger.updateSpinner(`Creating ${week.title} - ${workout.title}...`);
        
        const routine = await createRoutineFromWorkout(
          workout,
          week,
          folder.id,
          allMatches
        );
        
        await hevyClient.createRoutine(routine);
        createdRoutines++;
      }
    }

    logger.succeedSpinner(`Created ${createdRoutines} routines in ${totalWeeks} weeks`);
    logger.log('');
    logger.success('Import completed successfully!');
    logger.info(`Check your Hevy app for the "${workoutProgram.title}" folder.`);

  } catch (error) {
    logger.failSpinner('Import failed');
    logger.error(`Error: ${error}`);
  }
}

async function matchAllExercises(
  program: WorkoutProgram,
  matcher: ExerciseMatcher
): Promise<Map<string, ExerciseMatch>> {
  const uniqueExercises = new Map<string, ExerciseMatch>();

  for (const week of program.weeks) {
    for (const workout of week.workouts) {
      for (const exercise of workout.exercises) {
        const exerciseName = exercise.name.toLowerCase().trim();
        
        if (!uniqueExercises.has(exerciseName)) {
          const match = matcher.findBestMatch(exercise);
          
          if (match && match.confidence > 0.6) {
            uniqueExercises.set(exerciseName, match);
          } else {
            // Handle unmatched exercises - could prompt user or use best guess
            const matches = matcher.findMatches(exercise, 3);
            if (matches.length > 0) {
              uniqueExercises.set(exerciseName, matches[0]);
            }
          }
        }
      }
    }
  }

  return uniqueExercises;
}

function showPreview(program: WorkoutProgram, matches: Map<string, ExerciseMatch>): void {
  logger.subheader('📋 Import Preview');
  logger.log(`Program: ${program.title}`);
  logger.log(`Weeks: ${program.weeks.length}`);
  
  let totalWorkouts = 0;
  let totalExercises = 0;

  for (const week of program.weeks) {
    totalWorkouts += week.workouts.length;
    for (const workout of week.workouts) {
      totalExercises += workout.exercises.length;
    }
  }

  logger.log(`Total Workouts: ${totalWorkouts}`);
  logger.log(`Total Exercises: ${totalExercises}`);
  logger.log('');

  logger.subheader('🏋️ Exercise Matches');
  const matchData = Array.from(matches.entries()).map(([name, match]) => ({
    'Exercise': name,
    'Hevy Template': match.template.title,
    'Confidence': `${Math.round(match.confidence * 100)}%`,
  }));

  logger.table(matchData);
  logger.log('');
  logger.info('Run without --preview to import to Hevy');
}

function createRoutineFromWorkout(
  workout: any,
  week: any,
  folderId: number,
  matches: Map<string, ExerciseMatch>
): PostRoutineRequest {
  const exercises: PostRoutineExercise[] = workout.exercises.map((exercise: any) => {
    const match = matches.get(exercise.name.toLowerCase().trim());
    
    if (!match) {
      throw new Error(`No template found for exercise: ${exercise.name}`);
    }

    const sets: PostRoutineSet[] = exercise.sets.map((set: any) => ({
      type: set.type || 'normal',
      weight_kg: set.weight || null,
      reps: set.reps || null,
      rep_range: set.repRange ? {
        start: set.repRange.min,
        end: set.repRange.max,
      } : null,
      distance_meters: set.distance || null,
      duration_seconds: set.duration || null,
      custom_metric: null,
    }));

    return {
      exercise_template_id: match.templateId,
      superset_id: null,
      rest_seconds: exercise.restSeconds || null,
      notes: exercise.notes || null,
      sets,
    };
  });

  return {
    routine: {
      title: `${week.title} - ${workout.title}`,
      folder_id: folderId,
      notes: workout.description || '',
      exercises,
    },
  };
}