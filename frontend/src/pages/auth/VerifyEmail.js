import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Link,
  Paper,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { MarkEmailReadOutlined } from '@mui/icons-material';
import useApi from '../../hooks/useApi';

const VerifyEmail = () => {
  const { token } = useParams();
  const { loading, error, post } = useApi();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await post('/api/users/verify-email', { token });
        setVerified(true);
      } catch (err) {
        // Error is handled by useApi hook
      }
    };

    verifyEmail();
  }, [token, post]);

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Avatar
            sx={{ m: 1, bgcolor: verified ? 'success.main' : 'warning.main' }}
          >
            <MarkEmailReadOutlined />
          </Avatar>
          <Typography component="h1" variant="h5" gutterBottom>
            Email Verification
          </Typography>

          {loading ? (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <CircularProgress size={24} sx={{ mb: 2 }} />
              <Typography>Verifying your email...</Typography>
            </Box>
          ) : error ? (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography color="error" gutterBottom>
                {error}
              </Typography>
              <Typography variant="body2" gutterBottom>
                The verification link may be invalid or expired.
              </Typography>
              <Link component={RouterLink} to="/login" variant="body2">
                Return to login
              </Link>
            </Box>
          ) : (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography color="success.main" gutterBottom>
                Your email has been verified successfully!
              </Typography>
              <Typography variant="body2" gutterBottom>
                You can now sign in to your account.
              </Typography>
              <Link component={RouterLink} to="/login" variant="body2">
                Proceed to login
              </Link>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default VerifyEmail; 