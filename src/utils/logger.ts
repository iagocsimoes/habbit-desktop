import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const logFile = path.join(app.getPath('userData'), 'habbit.log');

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: string, ...args: any[]): void {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ');
  const line = `[${timestamp()}] [${level}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch {}
  // Also output to stdout for dev mode
  if (level === 'ERROR') {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }
}

export const logger = {
  info: (...args: any[]) => write('INFO', ...args),
  warn: (...args: any[]) => write('WARN', ...args),
  error: (...args: any[]) => write('ERROR', ...args),
  getLogPath: () => logFile,
};
