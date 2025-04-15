import React, { useState } from 'react';
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import StockSearch from '../components/StockSearch';
import stockService from '../services/stockService';

const TradingScreen = () => {
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStockSelect = async (stock) => {
    setLoading(true);
    setError(null);
    try {
      const quote = await stockService.getStockQuote(stock.symbol, stock.exchange);
      setStockData(quote);
      setSelectedStock(stock);
    } catch (err) {
      setError('Failed to fetch stock data. Please try again.');
      setStockData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Stock Search
            </Typography>
            <StockSearch onStockSelect={handleStockSelect} />
          </Paper>
        </Grid>

        {selectedStock && stockData && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedStock.name} ({selectedStock.symbol})
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Current Price: {stockData.price}
                </Typography>
                <Typography variant="body1">
                  Change: {stockData.change}%
                </Typography>
                <Typography variant="body1">
                  Volume: {stockData.volume}
                </Typography>
                <Typography variant="body1">
                  Day High: {stockData.dayHigh}
                </Typography>
                <Typography variant="body1">
                  Day Low: {stockData.dayLow}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default TradingScreen;