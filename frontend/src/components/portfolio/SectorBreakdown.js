import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  CircularProgress,
  Tabs,
  Tab,
  ThemeProvider,
  createTheme
} from '@mui/material';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import api from '../../utils/axiosConfig';

// Create a default theme to use
const defaultTheme = createTheme();

const SectorBreakdown = () => {
  const [tabValue, setTabValue] = useState(0);
  const [sectorData, setSectorData] = useState({ sectors: [], industries: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Define colors for pie chart sectors
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28BFF', 
    '#FF6B6B', '#4ECDC4', '#FF9F1C', '#6A0572', '#AB83A1',
    '#1A535C', '#4ECDC4', '#F7FFF7', '#FF6B6B', '#FFE66D'
  ];

  useEffect(() => {
    const fetchSectorData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get('/api/portfolio/sectors');
        setSectorData(data);
      } catch (err) {
        console.error('Error fetching sector data:', err);
        setError('Failed to load sector breakdown');
        // Use fallback data on error
        setSectorData(generateFallbackData());
      } finally {
        setLoading(false);
      }
    };

    fetchSectorData();
  }, []);

  // Generate fallback data if API fails or returns empty data
  const generateFallbackData = () => {
    return {
      sectors: [
        { name: 'Technology', value: 532.36, percentage: 33.1 },
        { name: 'Financial Services', value: 371.52, percentage: 23.1 },
        { name: 'Healthcare', value: 225.18, percentage: 14.0 },
        { name: 'Consumer Cyclical', value: 160.85, percentage: 10.0 },
        { name: 'Energy', value: 128.68, percentage: 8.0 },
        { name: 'Real Estate', value: 80.42, percentage: 5.0 },
        { name: 'Basic Materials', value: 64.34, percentage: 4.0 },
        { name: 'Utilities', value: 45.04, percentage: 2.8 }
      ],
      industries: [
        { name: 'Software', value: 337.78, percentage: 21.0 },
        { name: 'Banking', value: 257.35, percentage: 16.0 },
        { name: 'Semiconductors', value: 194.58, percentage: 12.1 },
        { name: 'Pharmaceuticals', value: 160.85, percentage: 10.0 },
        { name: 'Oil & Gas', value: 128.68, percentage: 8.0 },
        { name: 'Insurance', value: 114.20, percentage: 7.1 },
        { name: 'Biotechnology', value: 64.34, percentage: 4.0 },
        { name: 'Real Estate Investment', value: 80.42, percentage: 5.0 },
        { name: 'Electric Utilities', value: 45.04, percentage: 2.8 },
        { name: 'Retail', value: 64.34, percentage: 4.0 }
      ]
    };
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Get current data based on selected tab
  const currentData = tabValue === 0 ? sectorData.sectors : sectorData.industries;

  // Format data with additional info for tooltip
  const enhancedChartData = currentData.map(item => ({
    name: item.name,
    value: item.percentage,
    formattedValue: item.value.toLocaleString('en-IN', {
      maximumFractionDigits: 2
    })
  }));

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            p: 1.5,
            border: `1px solid ${defaultTheme.palette.divider}`,
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {payload[0].name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {payload[0].value.toFixed(2)}%
          </Typography>
          <Typography variant="body2" color="textSecondary">
            ₹{payload[0].payload.formattedValue}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Portfolio Allocation
          </Typography>
          
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            sx={{ mb: 2 }}
          >
            <Tab label="Sectors" />
            <Tab label="Industries" />
          </Tabs>
          
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={300}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={300}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : enhancedChartData.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={300}>
              <Typography color="textSecondary">No data available</Typography>
            </Box>
          ) : (
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={enhancedChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => 
                      percent > 5 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
                    }
                  >
                    {enhancedChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={(value, entry, index) => {
                      return (
                        <span style={{ color: defaultTheme.palette.text.primary }}>
                          {value} ({enhancedChartData[index]?.value.toFixed(1)}%)
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </ThemeProvider>
  );
};

export default SectorBreakdown; 