import React from 'react';
import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const PortfolioCard = ({ logo, name, totalShare, shareChange, totalReturn, trend }) => {
  const isPositive = trend === 'up';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'success.main' : 'error.main';

  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: 2,
      '&:hover': {
        boxShadow: (theme) => theme.shadows[4],
        transform: 'translateY(-4px)',
        transition: 'all 0.3s ease-in-out',
      },
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar src={logo} alt={name} sx={{ width: 32, height: 32, mr: 1 }} />
          <Typography variant="subtitle1">{name}</Typography>
          <TrendIcon sx={{ ml: 'auto', color: trendColor }} />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {totalShare}
          </Typography>
          <Typography
            variant="body2"
            color={trendColor}
          >
            {shareChange}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Total Return
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {totalReturn}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PortfolioCard; 