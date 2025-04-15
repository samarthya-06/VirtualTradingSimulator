import React, { useState } from 'react';
import { Card, CardContent, Box, Typography, Avatar, ButtonGroup, Button } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const timeRanges = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'];

const StockChart = () => {
  const [timeRange, setTimeRange] = useState('1M');

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Stock Price',
        data: [0, 3000, 1500, 4500, 3000, 4500, 3000, 6000, 4500, 6000, 4500, 6000],
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        tension: 0.1,
        fill: true
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
      filler: {
        propagate: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              src="/placeholder.svg"
              alt="Amazon"
              sx={{ width: 40, height: 40, mr: 2 }}
            />
            <Box>
              <Typography variant="h6">Amazon</Typography>
              <Typography variant="body2" color="text.secondary">
                AMZN
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6">$201.01</Typography>
            <Typography
              variant="body2"
              color="success.main"
            >
              +20.6% Last update 15:40
            </Typography>
          </Box>
        </Box>

        <ButtonGroup
          variant="outlined"
          size="small"
          sx={{ mb: 3 }}
        >
          {timeRanges.map((range) => (
            <Button
              key={range}
              onClick={() => setTimeRange(range)}
              variant={timeRange === range ? 'contained' : 'outlined'}
            >
              {range}
            </Button>
          ))}
        </ButtonGroup>

        <Box sx={{ height: 300 }}>
          <Line options={options} data={chartData} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default StockChart; 