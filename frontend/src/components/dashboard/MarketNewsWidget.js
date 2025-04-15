import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Card,
  CardActionArea
} from '@mui/material';
import {
  Article as ArticleIcon,
  OpenInNew as OpenInNewIcon,
  Close as CloseIcon,
  Newspaper as NewspaperIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { fetchMarketNews } from '../../features/market/marketSlice';

const MarketNewsWidget = () => {
  const dispatch = useDispatch();
  const { marketNews, isLoadingNews } = useSelector((state) => state.market);
  const [selectedNews, setSelectedNews] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Fetch 5 news items for the widget with refresh=true to ensure we get fresh data
    dispatch(fetchMarketNews({ count: 5, refresh: true }));
  }, [dispatch]);

  const handleNewsClick = (news) => {
    setSelectedNews(news);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openNewsInBrowser = (url) => {
    // Check if URL is valid
    if (!url || url.includes('example.com')) {
      // If using fallback URLs, open a search for the headline instead
      if (selectedNews && selectedNews.headline) {
        const searchQuery = encodeURIComponent(selectedNews.headline + ' stock market news');
        window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank', 'noopener,noreferrer');
      } else {
        window.open('https://economictimes.indiatimes.com/markets', '_blank', 'noopener,noreferrer');
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoadingNews) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <NewspaperIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Market News</Typography>
        </Box>
      </Box>

      {marketNews && marketNews.length > 0 ? (
        <Box>
          {marketNews.slice(0, 5).map((news, index) => (
            <Card
              key={news.id || index}
              sx={{
                mb: 1.5,
                borderRadius: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                overflow: 'visible'
              }}
            >
              <CardActionArea onClick={() => handleNewsClick(news)}>
                <Box sx={{ p: 1.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      mb: 0.5,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      overflow: 'hidden',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                    }}
                  >
                    {news.headline}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Chip
                      label={news.source}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(news.datetime)}
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      ) : (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No market news available at the moment.
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="text"
          size="small"
          endIcon={<ArrowForwardIcon />}
          onClick={() => setDialogOpen(true)}
          color="primary"
        >
          View All News
        </Button>
      </Box>

      {/* News Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {selectedNews ? 'News Details' : 'Indian Stock Market News'}
          </Typography>
          <IconButton onClick={handleCloseDialog} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 3, py: 2 }}>
          {selectedNews ? (
            <Box>
              {selectedNews.image && !selectedNews.image.includes('placeholder') && (
                <Paper sx={{ mb: 3, width: '100%', height: 250, overflow: 'hidden', borderRadius: 2 }}>
                  <img
                    src={selectedNews.image}
                    alt={selectedNews.headline}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://via.placeholder.com/800x400/e0f2ff/0a5cad?text=${selectedNews.source || 'Market News'}`;
                    }}
                  />
                </Paper>
              )}
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
                {selectedNews.headline}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Chip
                  label={selectedNews.source}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mr: 1.5, fontWeight: 500 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {formatDate(selectedNews.datetime)}
                </Typography>
              </Box>
              <Typography variant="body1" paragraph sx={{ mb: 4, lineHeight: 1.7 }}>
                {selectedNews.summary || `Latest market news from ${selectedNews.source} about Indian stock markets.`}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<OpenInNewIcon />}
                onClick={() => openNewsInBrowser(selectedNews.url)}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Read Full Article
              </Button>
            </Box>
          ) : (
            <Box>
              {marketNews && marketNews.map((news, index) => (
                <Paper
                  key={news.id || index}
                  elevation={0}
                  sx={{
                    mb: 2,
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                  onClick={() => setSelectedNews(news)}
                >
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {news.image && !news.image.includes('placeholder') ? (
                      <Box sx={{ flexShrink: 0, width: 100, height: 100, borderRadius: 1, overflow: 'hidden' }}>
                        <img
                          src={news.image}
                          alt={news.source}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://via.placeholder.com/100x100/e0f2ff/0a5cad?text=${news.source}`;
                          }}
                        />
                      </Box>
                    ) : (
                      <Box sx={{
                        flexShrink: 0,
                        width: 100,
                        height: 100,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover'
                      }}>
                        <NewspaperIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                      </Box>
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, lineHeight: 1.3 }}>
                        {news.headline}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {news.summary?.substring(0, 120)}
                        {news.summary?.length > 120 ? '...' : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          label={news.source}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mr: 1.5, fontWeight: 500 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(news.datetime)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {selectedNews && (
            <Button
              onClick={() => setSelectedNews(null)}
              color="primary"
              variant="outlined"
              sx={{ mr: 1, borderRadius: 2 }}
            >
              Back to News List
            </Button>
          )}
          <Button
            onClick={handleCloseDialog}
            color="primary"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MarketNewsWidget;
