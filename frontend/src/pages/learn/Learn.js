import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Container,
  Paper,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import {
  School as SchoolIcon,
  AccessTime as TimeIcon,
  ArrowForward as ArrowForwardIcon,
  YouTube as YouTubeIcon,
  Article as ArticleIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import learnService from '../../services/learnService';
import ModuleList from '../../components/learn/ModuleList';
import EducationalResources from '../../components/learn/EducationalResources';

const Learn = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // No tabs needed as we're only showing Educational Resources

  useEffect(() => {
    const fetchModules = async () => {
      try {
        setLoading(true);
        const data = await learnService.getModules();
        setModules(data);
        setError(null);
      } catch (err) {
        setError('Failed to load learning modules. Please try again later.');
        console.error('Error fetching modules:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  // Helper function to get color based on difficulty
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'error';
      default:
        return 'default';
    }
  };

  // No tab change handler needed

  // Directly render Educational Resources

  const renderModules = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
    }

    if (modules.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center', my: 2 }}>
          <SchoolIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No learning modules available yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Check back soon as we're constantly adding new educational content.
          </Typography>
        </Paper>
      );
    }

    return (
      <Grid container spacing={3}>
        {modules.map((module) => (
          <Grid item xs={12} sm={6} md={4} key={module._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardActionArea>
                <CardMedia
                  component="img"
                  height="140"
                  image={module.thumbnail || '/assets/images/module-default.jpg'}
                  alt={module.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="div" gutterBottom>
                      {module.title}
                    </Typography>
                    <Chip
                      size="small"
                      label={module.difficulty}
                      color={getDifficultyColor(module.difficulty)}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {module.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                    <TimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {module.totalDuration} mins • {module.totalLessons} lessons
                    </Typography>
                  </Box>
                </CardContent>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    fullWidth
                  >
                    Start Learning
                  </Button>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Learn
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Enhance your trading knowledge with our curated educational resources.
        </Typography>

        {/* Only showing Educational Resources */}
        <EducationalResources />
      </Box>
    </Container>
  );
};

export default Learn;