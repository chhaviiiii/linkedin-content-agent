import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export async function promptLine(message: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(message);
    return answer.trim();
  } finally {
    rl.close();
  }
}
