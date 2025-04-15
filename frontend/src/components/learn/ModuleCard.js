import React from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  CardActionArea,
  Typography, 
  Box, 
  Chip,
  LinearProgress,
  Stack
} from '@mui/material';
import { 
  School as SchoolIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ModuleCard = ({ module, progress }) => {
  const navigate = useNavigate();
  
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

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!progress || !module.totalLessons) return 0;
    return Math.round((progress.completedLessons.length / module.totalLessons) * 100);
  };

  const progressPercentage = calculateProgress();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => navigate(`/app/learn/modules/${module._id}`)}>
        <CardMedia
          component="img"
          height="140"
          image={module.thumbnail || '/assets/images/module-default.jpg'}
          alt={module.title}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography gutterBottom variant="h6" component="div" fontWeight="bold">
            {module.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {module.description}
          </Typography>
          
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip 
              size="small" 
              label={module.category.replace('-', ' ')} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              size="small" 
              label={module.difficulty} 
              color={getDifficultyColor(module.difficulty)}
            />
          </Stack>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TimeIcon fontSize="small" color="action" sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {module.totalDuration} mins
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SchoolIcon fontSize="small" color="action" sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {module.totalLessons} lessons
            </Typography>
          </Box>
          
          {progress && (
            <Box sx={{ width: '100%', mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progressPercentage}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progressPercentage} 
                sx={{ height: 8, borderRadius: 5 }}
              />
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default ModuleCard;