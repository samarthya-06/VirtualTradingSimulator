import React, { useState } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  CardActionArea, 
  Typography, 
  Box, 
  Link, 
  Chip, 
  Button,
  Paper,
  TextField,
  InputAdornment,
  Tab,
  Tabs
} from '@mui/material';
import { 
  YouTube as YouTubeIcon,
  Article as ArticleIcon,
  OpenInNew as OpenInNewIcon,
  Search as SearchIcon,
  Launch as LaunchIcon,
  VideoLibrary as VideoLibraryIcon,
  LibraryBooks as LibraryBooksIcon
} from '@mui/icons-material';
import VideoPlayer from './VideoPlayer';

// Stock Market Educational Videos
const videoResources = [
  {
    id: 'v1',
    title: 'Stock Market For Beginners | Basics of Stock Market',
    description: 'Learn the fundamentals of stock market investing for beginners with warikoo.',
    videoId: 'HNPbY6fSeo8',
    url: 'https://youtu.be/HNPbY6fSeo8?si=TReWLbkzuVP3FD70',
    category: 'basics'
  },
  {
    id: 'v2',
    title: 'Technical Analysis for Beginners | Chart Patterns & Indicators',
    description: 'Master the art of reading charts and using technical indicators to make better trading decisions.',
    videoId: 'eynxyoKgpng',
    url: 'https://www.youtube.com/watch?v=eynxyoKgpng',
    category: 'technical-analysis'
  },
  {
    id: 'v3',
    title: 'Risk Management in Stock Market | Stop Loss & Position Sizing',
    description: 'Learn essential risk management techniques every trader should implement to protect their capital.',
    videoId: 'YM1phN8gvUI',
    url: 'https://youtu.be/YM1phN8gvUI?si=RPhqOgMZnmntfQX1',
    category: 'risk-management'
  },
  {
    id: 'v4',
    title: 'Fundamental Analysis | How to Research Stocks',
    description: 'A comprehensive guide to researching and analyzing company fundamentals before investing.',
    videoId: 'kXYvRR7gV2E',
    url: 'https://youtu.be/kXYvRR7gV2E?si=CJvnd1j5R8YlbJC3',
    category: 'fundamental-analysis'
  },
  {
    id: 'v5',
    title: 'How to Read Financial Statements | Balance Sheet & P&L Analysis',
    description: 'Learn how to analyze company financial statements to make informed investment decisions.',
    videoId: '3jVAgr7mq9E',
    url: 'https://youtu.be/3jVAgr7mq9E?si=Bf8KxRuGeDw4M181',
    category: 'fundamental-analysis'
  },
  {
    id: 'v6',
    title: 'Value Investing Strategies | Warren Buffett Approach',
    description: 'Discover the principles of value investing and how to apply Warren Buffett\'s investment philosophy.',
    videoId: 'dWDPMD_rCY0',
    url: 'https://youtu.be/dWDPMD_rCY0?si=RmHKBSoPkLk_Kng4',
    category: 'strategies'
  },
  {
    id: 'v7',
    title: 'Stock Market Psychology | Managing Emotions While Trading',
    description: 'Understanding the psychological aspects of trading and how to manage emotions for better results.',
    videoId: 'jnkuXUSfoEs',
    url: 'https://youtu.be/jnkuXUSfoEs?si=9rZPEFQ3VkKOEmF0',
    category: 'psychology'
  },
  {
    id: 'v8',
    title: 'Portfolio Diversification | Asset Allocation Strategies',
    description: 'Learn how to build a diversified portfolio and allocate assets across different investment classes.',
    videoId: 'VEwLxHVMhh8',
    url: 'https://youtu.be/VEwLxHVMhh8?si=22kcjg333PYWMgL1',
    category: 'portfolio-management'
  }
];

const blogResources = [
  {
    id: 'b1',
    title: 'The Complete Guide to Candlestick Patterns',
    description: 'Learn to identify and trade using the most effective candlestick patterns.',
    url: 'https://www.investopedia.com/trading/candlestick-charting-what-is-it/',
    image: 'https://www.investopedia.com/thmb/5C5wSRXVQgkMJ5Z3Ug2Z5KqQZjA=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/candlestick-chart-GETTY-5c5b61d646e0fb0001dce4de.jpg',
    author: 'Investopedia',
    category: 'technical-analysis',
    readTime: '12 min read'
  },
  {
    id: 'b2',
    title: 'How to Build a Trading Plan',
    description: 'The step-by-step process to create a personalized trading strategy.',
    url: 'https://www.babypips.com/learn/forex/how-to-make-a-trading-plan',
    image: 'https://www.babypips.com/wp-content/uploads/2020/06/trading-plan-image.png',
    author: 'BabyPips',
    category: 'strategies',
    readTime: '15 min read'
  },
  {
    id: 'b3',
    title: 'Understanding Market Psychology',
    description: 'How emotions drive market movements and how to use this to your advantage.',
    url: 'https://www.tradingview.com/education/marketpsychology/',
    image: 'https://www.tradingacademy.com/assets/images/resources/article-images/psychology-of-trading.jpg',
    author: 'TradingView',
    category: 'psychology',
    readTime: '10 min read'
  }
];

const getCategoryColor = (category) => {
  const categories = {
    'basics': 'primary',
    'technical-analysis': 'info',
    'fundamental-analysis': 'secondary',
    'strategies': 'success',
    'risk-management': 'warning',
    'psychology': 'error',
    'portfolio-management': 'info',
    'advanced': 'default'
  };
  
  return categories[category] || 'default';
};

const formatCategory = (category) => {
  return category.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const VideoCard = ({ video }) => {
  return (
    <Card sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 2,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
      }
    }}>
      <Box sx={{ p: 0 }}>
        <VideoPlayer 
          videoId={video.videoId} 
          title={video.title} 
          description={video.description}
          url={video.url}
        />
        <CardContent sx={{ flexGrow: 1, pt: 2, px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 'bold',
                fontSize: '1.1rem',
                lineHeight: 1.3,
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {video.title}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 3,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              height: '4.5em'
            }}
          >
            {video.description}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 'auto' }}>
            <Chip 
              size="medium"
              label={formatCategory(video.category)} 
              color={getCategoryColor(video.category)}
              sx={{
                fontWeight: 'bold',
                borderRadius: '16px',
                px: 2,
                py: 2.5,
                fontSize: '0.85rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                '&:hover': {
                  boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            />
          </Box>
        </CardContent>
      </Box>
    </Card>
  );
};

const BlogCard = ({ blog }) => {
  const handleBlogClick = () => {
    window.open(blog.url, '_blank');
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={handleBlogClick}>
        <CardMedia
          component="img"
          height="140"
          image={blog.image || '/assets/images/blog-default.jpg'}
          alt={blog.title}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', fontSize: '1rem' }}>
              {blog.title}
            </Typography>
            <ArticleIcon fontSize="small" color="action" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {blog.description}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 'auto' }}>
              <Chip 
              size="medium"
                label={formatCategory(blog.category)} 
                color={getCategoryColor(blog.category)}
              sx={{
                fontWeight: 'bold',
                borderRadius: '16px',
                px: 2,
                py: 2.5,
                fontSize: '0.85rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                '&:hover': {
                  boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const EducationalResources = () => {
  const [resourceType, setResourceType] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const handleResourceTypeChange = (_, newValue) => {
    setResourceType(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const filteredVideos = videoResources.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatCategory(video.category).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBlogs = blogResources.filter(blog => 
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatCategory(blog.category).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ mt: 3 }}>
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <TextField
          fullWidth
          placeholder="Search for stock market videos..."
          value={searchQuery}
          onChange={handleSearchChange}
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
              '&:hover fieldset': { borderColor: 'primary.main' },
            }
          }}
          size="small"
        />
        
        <Box sx={{ mt: 2 }}>
          <Tabs 
            value={resourceType} 
            onChange={handleResourceTypeChange}
            variant="fullWidth"
          >
            <Tab icon={<VideoLibraryIcon />} iconPosition="start" label="Videos" />
            <Tab icon={<LibraryBooksIcon />} iconPosition="start" label="Blog Articles" />
          </Tabs>
        </Box>
      </Paper>

      {resourceType === 0 ? (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <YouTubeIcon color="error" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h5" component="h2" fontWeight="bold">
                Stock Market Classes with Pranjal Kamra
              </Typography>
            </Box>
            <Button 
              variant="contained"
              size="small" 
              endIcon={<OpenInNewIcon />}
              href="https://youtube.com/playlist?list=PLFQ0hRWyH11RS4KUPadj6aoC2KtEHVIfN"
              target="_blank"
              color="error"
              sx={{ fontWeight: 'bold', borderRadius: '8px', textTransform: 'none' }}
            >
              More on YouTube
            </Button>
          </Box>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {filteredVideos.length > 0 ? (
              filteredVideos.map((video) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={video.id}>
                  <VideoCard video={video} />
                </Grid>
              ))
            ) : (
              <Box sx={{ p: 3, textAlign: 'center', width: '100%' }}>
                <Typography variant="body1" color="text.secondary">
                  No video resources found matching your search.
                </Typography>
              </Box>
            )}
          </Grid>
        </Box>
      ) : (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ArticleIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h5" component="h2" fontWeight="bold">
                Blog Resources
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              size="small" 
              endIcon={<OpenInNewIcon />}
              href="https://www.investopedia.com/trading-4427765"
              target="_blank"
            >
              More Articles
            </Button>
          </Box>
          <Grid container spacing={3}>
            {filteredBlogs.length > 0 ? (
              filteredBlogs.map((blog) => (
                <Grid item xs={12} sm={6} md={4} key={blog.id}>
                  <BlogCard blog={blog} />
                </Grid>
              ))
            ) : (
              <Box sx={{ p: 3, textAlign: 'center', width: '100%' }}>
                <Typography variant="body1" color="text.secondary">
                  No blog resources found matching your search.
                </Typography>
              </Box>
            )}
          </Grid>
        </Box>
      )}

      <Paper sx={{ p: 3, mt: 5, bgcolor: 'primary.50', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Educational Partners & Resources
        </Typography>
        <Typography variant="body2" paragraph color="text.secondary">
          Enhance your trading knowledge with these trusted educational resources from our partners.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Link href="https://www.investopedia.com/trading-4427765" target="_blank" underline="none">
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<LaunchIcon />} 
                size="large"
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                Investopedia
              </Button>
            </Link>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Link href="https://www.babypips.com/learn" target="_blank" underline="none">
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<LaunchIcon />} 
                size="large"
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                BabyPips
              </Button>
            </Link>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Link href="https://www.tradingview.com/education/" target="_blank" underline="none">
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<LaunchIcon />} 
                size="large"
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                TradingView
              </Button>
            </Link>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Link href="https://www.youtube.com/c/TraderTV" target="_blank" underline="none">
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<YouTubeIcon />} 
                size="large"
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                TraderTV
              </Button>
            </Link>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default EducationalResources; 