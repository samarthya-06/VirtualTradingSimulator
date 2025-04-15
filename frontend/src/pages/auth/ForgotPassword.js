import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Avatar,
} from '@mui/material';
import { LockResetOutlined } from '@mui/icons-material';
import { validateForgotPassword } from '../../utils/validation';
import useForm from '../../hooks/useForm';
import useApi from '../../hooks/useApi';
import AlertMessage from '../../components/common/AlertMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ForgotPassword = () => {
  const [success, setSuccess] = useState(false);
  const { loading, error, post } = useApi();

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
    useForm(
      {
        email: '',
      },
      validateForgotPassword
    );

  const onSubmit = async (formData) => {
    try {
      await post('/api/users/forgot-password', formData);
      setSuccess(true);
    } catch (err) {
      // Error is handled by useApi hook
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

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
          <Avatar sx={{ m: 1, bgcolor: 'warning.main' }}>
            <LockResetOutlined />
          </Avatar>
          <Typography component="h1" variant="h5">
            Forgot Password
          </Typography>
          {success ? (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography color="success.main" gutterBottom>
                Password reset instructions have been sent to your email.
              </Typography>
              <Link component={RouterLink} to="/login" variant="body2">
                Return to login
              </Link>
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              sx={{ mt: 1, width: '100%' }}
            >
              <Typography variant="body2" sx={{ mb: 3 }}>
                Enter your email address and we'll send you instructions to reset
                your password.
              </Typography>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.email && Boolean(errors.email)}
                helperText={touched.email && errors.email}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Send Reset Instructions
              </Button>
              <Link component={RouterLink} to="/login" variant="body2">
                Remember your password? Sign in
              </Link>
            </Box>
          )}
        </Paper>
      </Box>
      <AlertMessage
        open={Boolean(error)}
        handleClose={() => {}}
        severity="error"
        message={error}
      />
    </Container>
  );
};

export default ForgotPassword; 