import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Grid, 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  Paper,
  Container,
  Divider,
  Chip,
  Stack,
  Button
} from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import ModuleCard from './ModuleCard';
import { getModules, getUserProgress } from '../../features/learn/learnSlice';

const ModuleList = () => {
  const dispatch = useDispatch();
  const { modules, isLoading, error } = useSelector((state) => state.learn);
  const { user } = useSelector((state) => state.auth);
  const [userProgressMap, setUserProgressMap] = React.useState({});
  const [filters, setFilters] = React.useState({
    category: '',
    difficulty: ''
  });

  useEffect(() => {
    dispatch(getModules());
  }, [dispatch]);

  useEffect(() => {
    // Fetch progress for each module if user is logged in and modules are loaded
    if (user && modules.length > 0) {
      const fetchAllProgress = async () => {
        const progressMap = {};
        
        for (const module of modules) {
          try {
            const progressAction = await dispatch(getUserProgress(module._id));
            if (getUserProgress.fulfilled.match(progressAction)) {
              progressMap[module._id] = progressAction.payload;
            }
          } catch (error) {
            console.error(`Error fetching progress for module ${module._id}:`, error);
          }
        }
        
        setUserProgressMap(progressMap);
      };
      
      fetchAllProgress();
    }
  }, [dispatch, modules, user]);

  const handleFilterChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type] === value ? '' : value // Toggle filter
    }));
  };

  const filteredModules = modules.filter(module => {
    if (filters.category && module.category !== filters.category) return false;
    if (filters.difficulty && module.difficulty !== filters.difficulty) return false;
    return true;
  });

  const categories = [
    { value: 'basics', label: 'Basics' },
    { value: 'technical-analysis', label: 'Technical Analysis' },
    { value: 'fundamental-analysis', label: 'Fundamental Analysis' },
    { value: 'strategies', label: 'Strategies' },
    { value: 'risk-management', label: 'Risk Management' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner', color: 'success' },
    { value: 'intermediate', label: 'Intermediate', color: 'warning' },
    { value: 'advanced', label: 'Advanced', color: 'error' }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Learning Modules
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Enhance your trading knowledge with our comprehensive learning modules.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Filters */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Filter by Category:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            {categories.map((category) => (
              <Chip
                key={category.value}
                label={category.label}
                clickable
                color={filters.category === category.value ? 'primary' : 'default'}
                onClick={() => handleFilterChange('category', category.value)}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
          
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Filter by Difficulty:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            {difficulties.map((difficulty) => (
              <Chip
                key={difficulty.value}
                label={difficulty.label}
                clickable
                color={filters.difficulty === difficulty.value ? difficulty.color : 'default'}
                onClick={() => handleFilterChange('difficulty', difficulty.value)}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
        ) : filteredModules.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', my: 2 }}>
            <SchoolIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {modules.length === 0 ? 
                "No learning modules available yet" : 
                "No modules match your selected filters"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {modules.length === 0 ? 
                "Check back soon as we're constantly adding new educational content." :
                "Try adjusting your filters to see more modules."}
            </Typography>
            {modules.length > 0 && filters.category && filters.difficulty && (
              <Button 
                variant="outlined" 
                color="primary" 
                sx={{ mt: 2 }}
                onClick={() => setFilters({ category: '', difficulty: '' })}
              >
                Clear Filters
              </Button>
            )}
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredModules.map((module) => (
              <Grid item xs={12} sm={6} md={4} key={module._id}>
                <ModuleCard 
                  module={module} 
                  progress={userProgressMap[module._id]}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default ModuleList;