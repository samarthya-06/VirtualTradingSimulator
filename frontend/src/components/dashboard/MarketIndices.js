import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, CircularProgress } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const MarketIndices = () => {
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const config = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          withCredentials: true
        };

        const response = await axios.get(`${API_URL}/api/market/indices`, config);
        
        // If no indices are available from the API, use default ones
        if (!response.data || response.data.length === 0) {
          setIndices([
            {
              symbol: 'NIFTY50',
              name: 'NIFTY 50',
              price: 22345.60,
              change: 0.75,
              volume: 123456789
            },
            {
              symbol: 'SENSEX',
              name: 'BSE SENSEX',
              price: 73456.25,
              change: -0.32,
              volume: 98765432
            }
          ]);
        } else {
          setIndices(response.data);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching market indices:', error);
        // Use default indices in case of error
        setIndices([
          {
            symbol: 'NIFTY50',
            name: 'NIFTY 50',
            price: 22345.60,
            change: 0.75,
            volume: 123456789
          },
          {
            symbol: 'SENSEX',
            name: 'BSE SENSEX',
            price: 73456.25,
            change: -0.32,
            volume: 98765432
          }
        ]);
        setLoading(false);
      }
    };

    fetchIndices();
    
    // Refresh every 5 minutes
    const intervalId = setInterval(fetchIndices, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body1">
        {error}
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      {indices.slice(0, 2).map((index) => (
        <Grid item xs={12} sm={6} key={index.symbol}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {index.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5" fontWeight="medium">
                  ₹{index.price?.toFixed(2)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {index.change >= 0 ? (
                    <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
                  ) : (
                    <TrendingDown sx={{ color: 'error.main', mr: 0.5 }} />
                  )}
                  <Typography
                    variant="body1"
                    fontWeight="medium"
                    color={index.change >= 0 ? 'success.main' : 'error.main'}
                  >
                    {index.change >= 0 ? '+' : ''}{index.change?.toFixed(2)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default MarketIndices; 