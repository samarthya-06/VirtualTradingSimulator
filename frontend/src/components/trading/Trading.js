import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab
} from '@mui/material';
import OrderForm from './OrderForm';
import MarketData from './MarketData';
import Portfolio from './Portfolio';
import Watchlist from './Watchlist';
import AdvancedTrading from './advanced/AdvancedTrading';

const Trading = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Trading Platform
      </Typography>

      <Grid container spacing={3}>
        {/* Main Trading Interface */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="trading tabs"
            >
              <Tab label="Basic Trading" />
              <Tab label="Advanced Trading" />
            </Tabs>

            <Box sx={{ mt: 2 }}>
              {activeTab === 0 ? (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <OrderForm />
                  </Grid>
                  <Grid item xs={12}>
                    <MarketData />
                  </Grid>
                </Grid>
              ) : (
                <AdvancedTrading />
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Portfolio />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Watchlist />
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Trading; 