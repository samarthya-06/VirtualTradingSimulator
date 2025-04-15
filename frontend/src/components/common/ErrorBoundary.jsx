import React, { Component } from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { Button, Card, Container, Typography, Box, Alert } from '@mui/material';
import { logout } from '../../features/auth/authSlice';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Show toast notification for the error
    toast.error(`An error occurred: ${error.message}`);
    
    // Check if it's a token error
    if (error.message && 
        (error.message.includes('Invalid token') || 
         error.message.includes('Authentication failed'))) {
      toast.warning('Session expired. Please log in again.', {
        autoClose: 5000,
        position: 'top-center',
      });
      
      // Log the user out automatically after token errors
      setTimeout(() => {
        this.props.logout();
      }, 2000);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  handleLogout = () => {
    this.props.logout();
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      // Check if it's a token error
      const isTokenError = this.state.error && 
        (this.state.error.message.includes('token') || 
         this.state.error.message.includes('Authentication') ||
         this.state.error.message.includes('unauthorized'));
      
      return (
        <Container maxWidth="md" sx={{ mt: 5, mb: 5 }}>
          <Card sx={{ p: 4, boxShadow: 3, borderRadius: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom color="error">
              Something went wrong
            </Typography>
            
            <Alert severity="error" sx={{ mb: 3 }}>
              {this.state.error && this.state.error.message}
            </Alert>
            
            {isTokenError ? (
              <Box>
                <Typography variant="body1" paragraph>
                  Your session has expired or is invalid. Please log in again to continue.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={this.handleLogout}
                  sx={{ mr: 2 }}
                >
                  Log In Again
                </Button>
              </Box>
            ) : (
              <Box>
                <Typography variant="body1" paragraph>
                  Please try refreshing the page or going back to the home page.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={this.handleReset}
                  sx={{ mr: 2 }}
                >
                  Try Again
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  onClick={() => window.location.href = '/'}
                >
                  Go to Home
                </Button>
              </Box>
            )}
            
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, overflowX: 'auto' }}>
                <Typography variant="subtitle2" component="h3" gutterBottom>
                  Error Details (Development Only):
                </Typography>
                <pre style={{ fontSize: '0.85rem' }}>
                  {this.state.error && this.state.error.stack}
                </pre>
              </Box>
            )}
          </Card>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default connect(null, { logout })(ErrorBoundary); 