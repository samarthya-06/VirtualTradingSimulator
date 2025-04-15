import React from 'react';
import { Box, Skeleton, Card, CardContent, Grid, useTheme } from '@mui/material';

/**
 * Skeleton loader component for displaying loading states
 * Can be configured for different content types
 */
const SkeletonLoader = ({ type = 'card', count = 1, height, width }) => {
  const theme = useTheme();
  
  // Card skeleton with title and content
  const renderCardSkeleton = () => (
    <Card sx={{ mb: 2, width: width || '100%' }}>
      <CardContent>
        <Skeleton variant="text" width="60%" height={28} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1.5 }} />
        <Skeleton variant="rectangular" height={height || 118} />
      </CardContent>
    </Card>
  );

  // Table row skeleton
  const renderTableRowSkeleton = () => (
    <Box sx={{ width: '100%', mb: 1 }}>
      <Skeleton variant="text" height={30} />
    </Box>
  );

  // Chart skeleton
  const renderChartSkeleton = () => (
    <Box sx={{ width: width || '100%', height: height || 200, mb: 2 }}>
      <Skeleton variant="rectangular" width="100%" height="100%" />
    </Box>
  );

  // Text skeleton for paragraphs
  const renderTextSkeleton = () => (
    <Box sx={{ width: width || '100%', mb: 1 }}>
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="95%" />
    </Box>
  );

  // Profile skeleton
  const renderProfileSkeleton = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Skeleton variant="circular" width={64} height={64} sx={{ mr: 2 }} />
      <Box sx={{ width: '100%' }}>
        <Skeleton variant="text" width="40%" height={28} />
        <Skeleton variant="text" width="70%" height={20} />
      </Box>
    </Box>
  );

  // Render the appropriate skeleton based on type
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return renderCardSkeleton();
      case 'table':
        return renderTableRowSkeleton();
      case 'chart':
        return renderChartSkeleton();
      case 'text':
        return renderTextSkeleton();
      case 'profile':
        return renderProfileSkeleton();
      default:
        return renderCardSkeleton();
    }
  };

  // Render multiple skeletons if count > 1
  if (count > 1) {
    return (
      <Grid container spacing={2}>
        {[...Array(count)].map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            {renderSkeleton()}
          </Grid>
        ))}
      </Grid>
    );
  }

  return renderSkeleton();
};

export default SkeletonLoader;