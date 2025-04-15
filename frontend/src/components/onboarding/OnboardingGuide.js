import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  useTheme
} from '@mui/material';
import { Close, NavigateNext, NavigateBefore } from '@mui/icons-material';

const steps = [
  {
    label: 'Welcome to Virtual Trading Simulator!',
    description: `Welcome to your new trading journey! This platform allows you to practice trading stocks with virtual money in a risk-free environment. Let's take a quick tour to help you get started.`,
  },
  {
    label: 'Dashboard',
    description: `Your dashboard provides an overview of your portfolio performance, market indices, and recent trades. It's your command center for all trading activities.`,
  },
  {
    label: 'Market',
    description: `Browse, search, and analyze stocks from NSE and BSE. View real-time prices, trends, and company information to make informed decisions.`,
  },
  {
    label: 'Trading',
    description: `Place buy and sell orders with various order types: Market, Limit, Stop, Stop-Limit, and Trailing Stop orders. Practice different trading strategies without risking real money.`,
  },
  {
    label: 'Portfolio',
    description: `Track your holdings, analyze your performance, and view your profit/loss metrics. The portfolio section gives you detailed insights into your investment decisions.`,
  },
  {
    label: 'Learn',
    description: `Improve your trading skills with educational resources. Complete lessons on trading fundamentals, strategies, and risk management to become a better trader.`,
  },
];

const OnboardingGuide = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      setActiveStep(0);
    }
  }, [open]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleComplete = () => {
    // Mark onboarding as completed in localStorage
    localStorage.setItem('onboardingCompleted', 'true');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          bgcolor: theme.palette.background.paper,
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Getting Started</Typography>
        <Button onClick={onClose} color="inherit" sx={{ minWidth: 'auto', p: 0.5 }}>
          <Close />
        </Button>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                <Typography>{step.description}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    startIcon={<NavigateBefore />}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleComplete : handleNext}
                    endIcon={index === steps.length - 1 ? null : <NavigateNext />}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Next'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3, bgcolor: 'transparent' }}>
            <Typography>All steps completed - you're ready to start trading!</Typography>
            <Button 
              onClick={handleComplete} 
              variant="contained" 
              sx={{ mt: 1, mr: 1 }}
            >
              Get Started
            </Button>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="primary">
          Skip Tour
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingGuide; 