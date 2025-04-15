import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const mockFavorites = [
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    price: '$ 201.01',
    change: '+ 2.5%',
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    price: '$ 142.50',
    change: '- 1.2%',
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    price: '$ 312.75',
    change: '+ 1.8%',
  },
];

const WatchlistWidget = () => {
  const navigate = useNavigate();

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">My Watchlist</Typography>
          <Button color="primary" onClick={() => navigate('/watchlist')}>
            See All
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mockFavorites.map((stock) => (
            <Box
              key={stock.symbol}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                '&:hover': {
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src="/placeholder.svg"
                  alt={stock.symbol}
                  sx={{ width: 32, height: 32 }}
                />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {stock.symbol}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stock.companyName}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {stock.price}
                </Typography>
                <Typography
                  variant="caption"
                  color={stock.change.startsWith('+') ? 'success.main' : 'error.main'}
                >
                  {stock.change}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default WatchlistWidget; 