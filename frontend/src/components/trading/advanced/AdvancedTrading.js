import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import AlgorithmicTrading from './AlgorithmicTrading';
import OptionsTrading from './OptionsTrading';
import PortfolioOptimization from './PortfolioOptimization';
import AdvancedAnalytics from './AdvancedAnalytics';

const AdvancedTrading = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="advanced trading tabs"
        >
          <Tab label="Algorithmic Trading" />
          <Tab label="Options Trading" />
          <Tab label="Portfolio Optimization" />
          <Tab label="Advanced Analytics" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && <AlgorithmicTrading />}
        {activeTab === 1 && <OptionsTrading />}
        {activeTab === 2 && <PortfolioOptimization />}
        {activeTab === 3 && <AdvancedAnalytics />}
      </Box>
    </Box>
  );
};

export default AdvancedTrading; 