import tradeService from './tradeService.js';

/**
 * Scheduler service for running periodic tasks
 */
const schedulerService = {
  /**
   * Start all scheduled tasks
   */
  startScheduledTasks: () => {
    console.log('Starting scheduled tasks...');
    
    // Process pending orders every minute
    setInterval(async () => {
      try {
        console.log('Processing pending orders...');
        const result = await tradeService.processPendingOrders();
        console.log(`Processed ${result.processed} orders, ${result.success} executed successfully, ${result.failed} failed`);
      } catch (error) {
        console.error('Error processing pending orders:', error);
      }
    }, 60000); // 1 minute
    
    // Add more scheduled tasks here as needed
  }
};

export default schedulerService; 