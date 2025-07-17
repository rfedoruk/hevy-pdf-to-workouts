import { importCommand } from './import.js';

export async function previewCommand(pdfPath: string): Promise<void> {
  await importCommand(pdfPath, { preview: true });
}