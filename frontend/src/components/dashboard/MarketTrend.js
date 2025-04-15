import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Avatar,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const mockStocks = [
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    currentPrice: 201.01,
    change: 2.5,
    volume: 1000,
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    currentPrice: 142.50,
    change: -1.2,
    volume: 500,
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    currentPrice: 312.75,
    change: 1.8,
    volume: 750,
  },
];

const MarketTrend = () => {
  const navigate = useNavigate();

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Market Trend</Typography>
          <Button color="primary" onClick={() => navigate('/market')}>
            See All
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Change</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Watchlist</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockStocks.map((stock) => (
                <TableRow key={stock.symbol} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        src="/placeholder.svg"
                        alt={stock.symbol}
                        sx={{ width: 24, height: 24, mr: 1 }}
                      />
                      <Box>
                        <Typography variant="body2">{stock.symbol}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stock.companyName}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    ${stock.currentPrice.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Typography
                      color={stock.change >= 0 ? 'success.main' : 'error.main'}
                    >
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    ${(stock.currentPrice * stock.volume).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      startIcon={<Add />}
                      size="small"
                      variant="outlined"
                    >
                      Add
                    </Button>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                    >
                      Trade
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default MarketTrend; 