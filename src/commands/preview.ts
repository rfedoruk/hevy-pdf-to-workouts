import { importCommand } from './import.js';

export async function previewCommand(excelPath: string): Promise<void> {
  await importCommand(excelPath, { preview: true });
}