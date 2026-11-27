import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { freeboxApi } from './freeboxApi.js';
import { config } from '../config.js';

export interface RebootSchedule {
  enabled: boolean;
  // Key: day index (0-6), Value: time "HH:MM"
  mapping: Record<number, string>;
}

const DEFAULT_SCHEDULE: RebootSchedule = {
  enabled: false,
  mapping: {}
};

// SECURITY: strict validation. Upstream spread req.body into the schedule and
// built the cron expression by string concatenation, so values like "*:*"
// produced a reboot every minute, and non-string values crashed the server
// at every start (persistent DoS).
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function sanitizeMapping(raw: unknown): Record<number, string> | null {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const mapping: Record<number, string> = {};
  for (const [d, t] of Object.entries(raw as Record<string, unknown>)) {
    const day = Number(d);
    if (!Number.isInteger(day) || day < 0 || day > 6) return null;
    if (typeof t !== 'string' || !HHMM.test(t)) return null;
    mapping[day] = t;
  }
  return mapping;
}

export class InvalidScheduleError extends Error {}

class RebootSchedulerService {
  private schedule: RebootSchedule;
  private tasks: cron.ScheduledTask[] = [];
  private configPath: string;

  constructor() {
    // Determine config file path (next to token file)
    const tokenPath = config.freebox.tokenFile;
    const configDir = path.dirname(tokenPath);
    this.configPath = path.join(configDir, '.reboot_schedule.json');
    
    this.schedule = this.loadSchedule();
    try {
      this.updateCronJob();
    } catch (error) {
      console.error('[Scheduler] Failed to schedule reboot jobs:', error);
    }
  }

  private loadSchedule(): RebootSchedule {
    if (fs.existsSync(this.configPath)) {
      try {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(data);
        
        // Migration logic for old format if necessary
        let mapping = parsed.mapping || parsed.advancedMapping || {};
        
        // If coming from very old format with days/time but no mapping
        if (Object.keys(mapping).length === 0 && Array.isArray(parsed.days) && parsed.time) {
          parsed.days.forEach((day: number) => {
            mapping[day] = parsed.time;
          });
        }

        const clean = sanitizeMapping(mapping);
        if (!clean) {
          console.error('[Scheduler] Stored schedule is invalid, ignoring it');
          return { ...DEFAULT_SCHEDULE };
        }
        return {
          enabled: parsed.enabled === true,
          mapping: clean
        };
      } catch (error) {
        console.error('[Scheduler] Failed to load schedule:', error);
      }
    }
    return { ...DEFAULT_SCHEDULE };
  }

  private saveSchedule() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.schedule, null, 2), 'utf-8');
      console.log(`[Scheduler] Saved schedule to ${this.configPath}`);
    } catch (error) {
      console.error('[Scheduler] Failed to save schedule:', error);
    }
  }

  getSchedule(): RebootSchedule {
    return this.schedule;
  }

  updateSchedule(newSchedule: unknown): RebootSchedule {
    const body = (newSchedule && typeof newSchedule === 'object' ? newSchedule : {}) as Record<string, unknown>;
    const mapping = 'mapping' in body ? sanitizeMapping(body.mapping) : this.schedule.mapping;
    if (!mapping) {
      throw new InvalidScheduleError('Planning invalide : jours 0-6 et heures au format HH:MM attendus');
    }
    if ('enabled' in body && typeof body.enabled !== 'boolean') {
      throw new InvalidScheduleError('Le champ "enabled" doit être un booléen');
    }
    this.schedule = {
      enabled: 'enabled' in body ? body.enabled === true : this.schedule.enabled,
      mapping
    };

    this.saveSchedule();
    this.updateCronJob();
    return this.schedule;
  }

  private updateCronJob() {
    // Stop and clear existing tasks
    this.tasks.forEach(task => task.stop());
    this.tasks = [];

    if (!this.schedule.enabled) {
      console.log('[Scheduler] Reboot schedule disabled');
      return;
    }

    // Always use mapping for scheduling
    Object.entries(this.schedule.mapping).forEach(([dayStr, time]) => {
      const day = parseInt(dayStr, 10);
      if (isNaN(day) || !time) return;

      if (isNaN(day) || day < 0 || day > 6 || typeof time !== 'string' || !HHMM.test(time)) return;
      const [hour, minute] = time.split(':').map((v) => parseInt(v, 10));
      const cronExpression = `${minute} ${hour} * * ${day}`;

      if (cron.validate(cronExpression)) {
        console.log(`[Scheduler] Scheduling reboot for day ${day} at ${time} (${cronExpression})`);
        const task = cron.schedule(cronExpression, async () => {
          console.log(`[Scheduler] Executing scheduled reboot (Day ${day})...`);
          try {
            // Check if API is authenticated before attempting reboot
            if (!freeboxApi.isLoggedIn()) {
              console.error('[Scheduler] Cannot reboot: Freebox API not authenticated. Please authenticate first.');
              return;
            }
            
            const result = await freeboxApi.reboot();
            if (result.success) {
              console.log('[Scheduler] Scheduled reboot command sent successfully');
            } else {
              console.error('[Scheduler] Scheduled reboot failed:', result.msg || result.error_code);
            }
          } catch (error) {
            console.error('[Scheduler] Scheduled reboot error:', error);
          }
        });
      } else {
        console.error(`[Scheduler] Invalid cron expression for day ${day}: ${cronExpression}`);
      }
    });
  }
}

export const rebootScheduler = new RebootSchedulerService();
