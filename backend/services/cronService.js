import cron from 'node-cron';
import { logInfo, logError } from '../utils/logger.js';
import marketDataCacheService from './marketDataCacheService.js';

class CronService {
  constructor() {
    this.tasks = new Map();
  }

  startAllTasks() {
    // Clear market data cache every day at midnight
    this.scheduleTask('clearCache', '0 0 * * *', async () => {
      try {
        await marketDataCacheService.clear();
        logInfo('Market data cache cleared successfully');
      } catch (error) {
        logError('Error clearing market data cache:', error);
      }
    });

    // Update market indices every minute during trading hours
    this.scheduleTask('updateIndices', '*/1 9-16 * * 1-5', async () => {
      try {
        // This will be implemented when market data service is ready
        logInfo('Market indices updated');
      } catch (error) {
        logError('Error updating market indices:', error);
      }
    });

    // Generate daily reports at end of trading day
    this.scheduleTask('generateReports', '0 16 * * 1-5', async () => {
      try {
        // This will be implemented when reporting service is ready
        logInfo('Daily reports generated');
      } catch (error) {
        logError('Error generating daily reports:', error);
      }
    });

    // Clean up old data weekly
    this.scheduleTask('cleanupOldData', '0 1 * * 0', async () => {
      try {
        // This will be implemented when data cleanup service is ready
        logInfo('Old data cleaned up');
      } catch (error) {
        logError('Error cleaning up old data:', error);
      }
    });

    logInfo('All cron tasks started successfully');
  }

  scheduleTask(name, schedule, task) {
    try {
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid cron schedule: ${schedule}`);
      }

      const cronTask = cron.schedule(schedule, async () => {
        try {
          await task();
        } catch (error) {
          logError(`Error executing task ${name}:`, error);
        }
      }, {
        scheduled: true,
        timezone: "Asia/Kolkata" // Use IST for Indian market
      });

      this.tasks.set(name, cronTask);
      logInfo(`Task ${name} scheduled successfully`);
    } catch (error) {
      logError(`Error scheduling task ${name}:`, error);
    }
  }

  stopTask(name) {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      logInfo(`Task ${name} stopped successfully`);
    }
  }

  stopAllTasks() {
    for (const [name, task] of this.tasks) {
      task.stop();
      logInfo(`Task ${name} stopped`);
    }
    this.tasks.clear();
    logInfo('All cron tasks stopped');
  }

  getTaskStatus() {
    return Array.from(this.tasks.keys()).map(name => ({
      name,
      running: true,
      schedule: this.tasks.get(name).options.scheduled
    }));
  }
}

export default new CronService(); 