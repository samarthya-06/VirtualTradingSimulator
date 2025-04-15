/**
 * Utility function to clear dashboard widgets from localStorage
 * This helps ensure that removed widgets are properly cleaned up
 */
export const clearRemovedWidgets = () => {
  try {
    // Get existing widgets from localStorage
    const savedWidgets = localStorage.getItem('dashboardWidgets');
    
    if (savedWidgets) {
      const parsedWidgets = JSON.parse(savedWidgets);
      
      // Filter out the removed widgets
      const filteredWidgets = parsedWidgets.filter(widget => 
        !['watchlist-summary', 'top-movers', 'upcoming-events'].includes(widget.id)
      );
      
      // Update order property
      const updatedWidgets = filteredWidgets.map((widget, index) => ({
        ...widget,
        order: index + 1
      }));
      
      // Save the filtered widgets back to localStorage
      localStorage.setItem('dashboardWidgets', JSON.stringify(updatedWidgets));
      
      console.log('Successfully removed deprecated widgets from localStorage');
      return true;
    }
  } catch (error) {
    console.error('Error clearing removed widgets:', error);
    return false;
  }
  
  return false;
};

export default clearRemovedWidgets;
