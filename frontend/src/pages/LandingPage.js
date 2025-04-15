import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  AppBar,
  Toolbar,
  useScrollTrigger,
  Fade,
  Grid,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';

// Styled components
const Section = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  scrollSnapAlign: 'start',
  padding: theme.spacing(4),
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: '#1976d2',
  boxShadow: 'none',
  transition: 'background-color 0.3s ease-in-out',
  '&.scrolled': {
    backgroundColor: '#1976d2',
  },
}));

const AnimatedBox = styled(Box)(({ theme }) => ({
  transform: 'translateY(50px)',
  opacity: 0,
  transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
  '&.visible': {
    transform: 'translateY(0)',
    opacity: 1,
  },
}));

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  useEffect(() => {
    const handleScroll = () => {
      document.querySelectorAll('.animate-on-scroll').forEach((element) => {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top <= window.innerHeight * 0.75;
        if (isVisible) {
          element.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/app/dashboard');
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <StyledAppBar className={trigger ? 'scrolled' : ''}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white' }}>
            Virtual Trading Simulator
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }} 
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button
              variant="contained"
              sx={{ 
                ml: 2,
                bgcolor: 'white',
                color: '#1976d2',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                }
              }}
              onClick={() => navigate('/register')}
            >
              Sign Up
            </Button>
          </Box>
        </Toolbar>
      </StyledAppBar>
      <Toolbar /> {/* Spacing for fixed AppBar */}

      {/* Hero Section */}
      <Section sx={{ background: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Fade in timeout={1000}>
                <Box>
                  <Typography
                    variant="h2"
                    component="h1"
                    sx={{ color: '#1976d2', fontWeight: 'bold', mb: 2 }}
                  >
                    Master Trading Risk-Free
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#1976d2', mb: 4 }}>
                    Practice trading stocks with virtual money in a real-time market simulation
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ 
                      bgcolor: '#1976d2',
                      '&:hover': {
                        bgcolor: '#1565c0',
                      }
                    }}
                    size="large"
                    onClick={() => navigate('/register')}
                  >
                    Start Trading Now
                  </Button>
                </Box>
              </Fade>
            </Grid>
            <Grid item xs={12} md={6}>
              <Fade in timeout={1500}>
                <Box
                  component="img"
                  src="/trading-illustration.svg"
                  alt="Trading Illustration"
                  sx={{ width: '100%', maxWidth: 500 }}
                />
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Section>

      {/* Features Section */}
      <Section sx={{ bgcolor: '#f5f5f5' }}>
        <Container maxWidth="lg">
          <AnimatedBox className="animate-on-scroll">
            <Typography variant="h3" component="h2" align="center" gutterBottom>
              Why Choose Us?
            </Typography>
            <Grid container spacing={4} sx={{ mt: 4 }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <TrendingUpIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Real-Time Trading
                  </Typography>
                  <Typography>
                    Experience live market conditions with real-time data and trading simulation
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <SchoolIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Learn & Practice
                  </Typography>
                  <Typography>
                    Access educational resources and practice trading strategies without risk
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <GroupsIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Community
                  </Typography>
                  <Typography>
                    Join a community of traders and compete on the leaderboard
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </AnimatedBox>
        </Container>
      </Section>

      {/* Call to Action Section */}
      <Section sx={{ bgcolor: '#1976d2' }}>
        <Container maxWidth="md">
          <AnimatedBox className="animate-on-scroll" sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              component="h2"
              sx={{ color: 'white', mb: 4 }}
            >
              Ready to Start Your Trading Journey?
            </Typography>
            <Typography variant="h6" sx={{ color: 'white', mb: 4 }}>
              Join thousands of traders who are already learning and practicing with our platform
            </Typography>
            <Button
              variant="contained"
              sx={{ 
                bgcolor: 'white',
                color: '#1976d2',
                mr: 2,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                }
              }}
              size="large"
              onClick={() => navigate('/register')}
            >
              Sign Up Now
            </Button>
            <Button
              variant="outlined"
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              size="large"
              onClick={() => navigate('/learn')}
            >
              Learn More
            </Button>
          </AnimatedBox>
        </Container>
      </Section>
    </Box>
  );
};

export default LandingPage;