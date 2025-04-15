import React, { useState } from 'react';
import { Box, TextField, Typography, List, ListItem, ListItemText, CircularProgress, Alert } from '@mui/material';
import stockService from '../services/stockService';

const StockSearch = ({ onStockSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await stockService.searchStocks(searchQuery);
      setResults(data);
    } catch (err) {
      setError('Failed to search stocks. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    handleSearch(value);
  };

  const handleStockClick = (stock) => {
    if (onStockSelect) {
      onStockSelect(stock);
    }
    setResults([]);
    setQuery('');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, position: 'relative' }}>
      <TextField
        fullWidth
        variant="outlined"
        label="Search stocks"
        value={query}
        onChange={handleInputChange}
        placeholder="Enter stock symbol or company name"
        sx={{ mb: 2 }}
      />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {results.length > 0 && (
        <List sx={{
          position: 'absolute',
          width: '100%',
          bgcolor: 'background.paper',
          boxShadow: 3,
          borderRadius: 1,
          zIndex: 1000,
          maxHeight: 400,
          overflow: 'auto'
        }}>
          {results.map((stock) => (
            <ListItem
              key={`${stock.symbol}-${stock.exchange}`}
              button
              onClick={() => handleStockClick(stock)}
            >
              <ListItemText
                primary={stock.symbol}
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {stock.name} ({stock.exchange})
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default StockSearch;