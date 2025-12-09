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
    this.updateCronJob();
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

        return { 
          enabled: parsed.enabled || false,
          mapping
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

  updateSchedule(newSchedule: Partial<RebootSchedule>): RebootSchedule {
    // We only expect 'enabled' and 'mapping' in the new schedule
    this.schedule = { 
      ...this.schedule,
      ...newSchedule 
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

      const [hour, minute] = time.split(':');
      const cronExpression = `${minute} ${hour} * * ${day}`;

      if (cron.validate(cronExpression)) {
        console.log(`[Scheduler] Scheduling reboot for day ${day} at ${time} (${cronExpression})`);
        this.tasks.push(cron.schedule(cronExpression, async () => {
          console.log(`[Scheduler] Executing scheduled reboot (Day ${day})...`);
          try {
            await freeboxApi.reboot();
          } catch (error) {
            console.error('[Scheduler] Scheduled reboot failed:', error);
          }
        }));
      } else {
        console.error(`[Scheduler] Invalid cron expression for day ${day}: ${cronExpression}`);
      }
    });
  }
}

export const rebootScheduler = new RebootSchedulerService();
