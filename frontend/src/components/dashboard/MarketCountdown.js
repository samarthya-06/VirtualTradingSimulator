import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { AccessTime, CheckCircle } from '@mui/icons-material';

const MarketCountdown = () => {
  const [marketStatus, setMarketStatus] = useState({
    isOpen: false,
    message: '',
    timeRemaining: '',
    nextEvent: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      const day = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = hours * 60 + minutes; // Convert to minutes for easier comparison

      // Indian stock market hours: Monday to Friday, 9:15 AM to 3:30 PM
      const marketOpenTime = 9 * 60 + 15; // 9:15 AM in minutes
      const marketCloseTime = 15 * 60 + 30; // 3:30 PM in minutes

      // Check if it's a weekend
      if (day === 0 || day === 6) {
        // Weekend (Sunday or Saturday)
        const nextOpenDay = day === 0 ? 1 : 2; // If Sunday, next is Monday (1); if Saturday, next is Monday (2 days away)
        const daysUntilOpen = nextOpenDay;

        setMarketStatus({
          isOpen: false,
          message: 'Market is closed for the weekend',
          timeRemaining: `Opens in ${daysUntilOpen} day${daysUntilOpen > 1 ? 's' : ''}`,
          nextEvent: 'Market opens on Monday at 9:15 AM',
        });
      } else if (currentTime < marketOpenTime) {
        // Weekday before market opens
        const minutesUntilOpen = marketOpenTime - currentTime;
        const hoursUntilOpen = Math.floor(minutesUntilOpen / 60);
        const minsRemaining = minutesUntilOpen % 60;

        setMarketStatus({
          isOpen: false,
          message: 'Market is closed',
          timeRemaining: `Opens in ${hoursUntilOpen}h ${minsRemaining}m`,
          nextEvent: 'Market opens today at 9:15 AM',
        });
      } else if (currentTime >= marketOpenTime && currentTime < marketCloseTime) {
        // Market is open
        const minutesUntilClose = marketCloseTime - currentTime;
        const hoursUntilClose = Math.floor(minutesUntilClose / 60);
        const minsRemaining = minutesUntilClose % 60;

        setMarketStatus({
          isOpen: true,
          message: 'Market is open',
          timeRemaining: `Closes in ${hoursUntilClose}h ${minsRemaining}m`,
          nextEvent: 'Market closes today at 3:30 PM',
        });
      } else {
        // Weekday after market closes
        if (day === 5) {
          // Friday after close - next open is Monday
          setMarketStatus({
            isOpen: false,
            message: 'Market is closed',
            timeRemaining: 'Opens on Monday',
            nextEvent: 'Market opens on Monday at 9:15 AM',
          });
        } else {
          // Weekday after close - next open is tomorrow
          setMarketStatus({
            isOpen: false,
            message: 'Market is closed',
            timeRemaining: 'Opens tomorrow',
            nextEvent: 'Market opens tomorrow at 9:15 AM',
          });
        }
      }

      setLoading(false);
    };

    // Initial check
    checkMarketStatus();

    // Update every minute
    const intervalId = setInterval(checkMarketStatus, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Skip loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <Typography>Checking market status...</Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: marketStatus.isOpen ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {marketStatus.isOpen ? (
          <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
        ) : (
          <AccessTime sx={{ color: 'error.main', mr: 1 }} />
        )}
        <Box>
          <Typography variant="subtitle1" fontWeight="medium" color={marketStatus.isOpen ? 'success.main' : 'error.main'}>
            {marketStatus.message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {marketStatus.nextEvent}
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="subtitle1"
        fontWeight="medium"
        color={marketStatus.isOpen ? 'success.main' : 'error.main'}
      >
        {marketStatus.timeRemaining}
      </Typography>
    </Paper>
  );
};

export default MarketCountdown;