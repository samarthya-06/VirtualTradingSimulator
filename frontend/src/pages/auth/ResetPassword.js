import React, { useState } from 'react';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
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
import { validateResetPassword } from '../../utils/validation';
import useForm from '../../hooks/useForm';
import useApi from '../../hooks/useApi';
import AlertMessage from '../../components/common/AlertMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const { loading, error, post } = useApi();

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
    useForm(
      {
        password: '',
        confirmPassword: '',
      },
      validateResetPassword
    );

  const onSubmit = async (formData) => {
    try {
      await post('/api/users/reset-password', {
        token,
        password: formData.password,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
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
            Reset Password
          </Typography>
          {success ? (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography color="success.main" gutterBottom>
                Your password has been reset successfully.
              </Typography>
              <Typography variant="body2" gutterBottom>
                Redirecting to login page...
              </Typography>
              <Link component={RouterLink} to="/login" variant="body2">
                Click here if you're not redirected
              </Link>
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              sx={{ mt: 1, width: '100%' }}
            >
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="New Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password && Boolean(errors.password)}
                helperText={touched.password && errors.password}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                id="confirmPassword"
                value={values.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                helperText={touched.confirmPassword && errors.confirmPassword}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Reset Password
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

export default ResetPassword; 