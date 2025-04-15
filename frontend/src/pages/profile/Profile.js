import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Avatar,
  Button,
  TextField,
  Paper,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Chip,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector, useDispatch } from 'react-redux';
import { Edit, Save, Cancel, Security, PhotoCamera, Phone, Mail, Badge, EmojiEvents } from '@mui/icons-material';
import { updateProfile, reset } from '../../features/auth/authSlice';
import { styled } from '@mui/system';

// Custom styled components
const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  fontSize: '3rem',
  backgroundColor: theme.palette.primary.main,
  boxShadow: theme.shadows[3],
  border: `4px solid ${theme.palette.background.paper}`,
}));

const AchievementCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100%',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
  },
}));

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const Profile = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, isLoading, isSuccess, isError, message } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [editMode, setEditMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile: {
      phone: '',
      address: '',
      bio: '',
      avatar: '',
    },
    password: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        profile: {
          phone: user?.profile?.phone || '',
          address: user?.profile?.address || '',
          bio: user?.profile?.bio || '',
          avatar: user?.profile?.avatar || '',
        },
        password: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (isSuccess) {
      setSnackbar({ open: true, message: 'Profile updated successfully', severity: 'success' });
      setEditMode(false);
      dispatch(reset());
    }

    if (isError) {
      setSnackbar({ open: true, message: message || 'Failed to update profile', severity: 'error' });
      dispatch(reset());
    }
  }, [isSuccess, isError, message, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!emailRegex.test(formData.email)) errors.email = 'Invalid email format';

    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const userData = {
      name: formData.name,
      email: formData.email,
      profile: formData.profile,
    };

    if (formData.password) {
      userData.password = formData.password;
    }

    dispatch(updateProfile(userData));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      profile: {
        phone: user?.profile?.phone || '',
        address: user?.profile?.address || '',
        bio: user?.profile?.bio || '',
        avatar: user?.profile?.avatar || '',
      },
      password: '',
      confirmPassword: '',
    });
    setValidationErrors({});
  };

  const handleChangePasswordClick = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Dummy achievements data (replace with real data from your API)
  const achievements = user?.achievements || [
    { badge: 'First Trade', dateEarned: new Date(2023, 0, 15) },
    { badge: 'Portfolio Diversity', dateEarned: new Date(2023, 1, 20) },
    { badge: 'Market Master', dateEarned: new Date(2023, 2, 5) },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 600 }}>
          Profile
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card sx={{ mb: 3, overflow: 'visible' }}>
                  <CardContent>
                    <Grid container spacing={3} alignItems="center">
                      <Grid item>
                        <Box sx={{ position: 'relative' }}>
                          <ProfileAvatar src={user?.profile?.avatar || ''}>
                            {!user?.profile?.avatar && user?.name?.charAt(0)}
                          </ProfileAvatar>
                          {editMode && (
                            <IconButton
                              sx={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                              }}
                              size="small"
                            >
                              <PhotoCamera />
                            </IconButton>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs>
                        {!editMode ? (
                          <>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                              {user?.name}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                              {user?.email}
                            </Typography>
                            {user?.profile?.phone && (
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                <Phone fontSize="small" color="action" sx={{ mr: 1 }} />
                                <Typography variant="body2">{user.profile.phone}</Typography>
                              </Box>
                            )}
                            {user?.profile?.bio && (
                              <Typography variant="body2" sx={{ mt: 2 }}>
                                {user.profile.bio}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                error={!!validationErrors.name}
                                helperText={validationErrors.name}
                                margin="dense"
                                variant="outlined"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                error={!!validationErrors.email}
                                helperText={validationErrors.email}
                                margin="dense"
                                variant="outlined"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Phone"
                                name="profile.phone"
                                value={formData.profile.phone}
                                onChange={handleChange}
                                margin="dense"
                                variant="outlined"
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Address"
                                name="profile.address"
                                value={formData.profile.address}
                                onChange={handleChange}
                                margin="dense"
                                variant="outlined"
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Bio"
                                name="profile.bio"
                                value={formData.profile.bio}
                                onChange={handleChange}
                                margin="dense"
                                variant="outlined"
                                multiline
                                rows={3}
                              />
                            </Grid>
                          </Grid>
                        )}
                      </Grid>
                      <Grid item>
                        {!editMode ? (
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Edit />}
                            onClick={handleEditClick}
                          >
                            Edit Profile
                          </Button>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<Save />}
                              onClick={handleSubmit}
                              disabled={isLoading}
                            >
                              Save Changes
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<Cancel />}
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                      value={tabValue}
                      onChange={handleTabChange}
                      aria-label="profile tabs"
                      variant={isMobile ? "scrollable" : "standard"}
                      scrollButtons={isMobile ? "auto" : false}
                    >
                      <Tab label="Account Info" />
                      <Tab label="Achievements" />
                      <Tab label="Security" />
                    </Tabs>
                  </Box>

                  <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="h6" sx={{ mb: 2 }}>
                            Account Details
                          </Typography>
                          <Divider sx={{ mb: 2 }} />
                          <Grid container spacing={1}>
                            <Grid item xs={4}>
                              <Typography variant="body2" color="text.secondary">
                                Member Since
                              </Typography>
                            </Grid>
                            <Grid item xs={8}>
                              <Typography variant="body2">
                                {user?.createdAt
                                  ? new Date(user.createdAt).toLocaleDateString()
                                  : 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="body2" color="text.secondary">
                                Membership
                              </Typography>
                            </Grid>
                            <Grid item xs={8}>
                              <Chip
                                label={user?.membership || 'Free'}
                                color={
                                  user?.membership === 'pro'
                                    ? 'primary'
                                    : 'default'
                                }
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="body2" color="text.secondary">
                                Virtual Balance
                              </Typography>
                            </Grid>
                            <Grid item xs={8}>
                              <Typography variant="body2">
                                ₹{user?.virtualBalance?.toLocaleString() || '0'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, height: '100%' }}>
                          <Typography variant="h6" sx={{ mb: 2 }}>
                            Contact Information
                          </Typography>
                          <Divider sx={{ mb: 2 }} />
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Mail color="action" sx={{ mr: 1 }} />
                                <Typography variant="body2">{user?.email || 'N/A'}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Phone color="action" sx={{ mr: 1 }} />
                                <Typography variant="body2">
                                  {user?.profile?.phone || 'Not provided'}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Address
                              </Typography>
                              <Typography variant="body2">
                                {user?.profile?.address || 'Not provided'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  <TabPanel value={tabValue} index={1}>
                    <Grid container spacing={3}>
                      {achievements.length > 0 ? (
                        achievements.map((achievement, index) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <AchievementCard>
                              <EmojiEvents fontSize="large" color="primary" sx={{ mb: 1 }} />
                              <Typography variant="h6" gutterBottom>
                                {achievement.badge}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Earned on:{' '}
                                {new Date(achievement.dateEarned).toLocaleDateString()}
                              </Typography>
                            </AchievementCard>
                          </Grid>
                        ))
                      ) : (
                        <Grid item xs={12}>
                          <Alert severity="info">
                            You haven't earned any achievements yet. Start trading to unlock
                            achievements!
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  </TabPanel>

                  <TabPanel value={tabValue} index={2}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="h6" sx={{ mb: 2 }}>
                            Password & Security
                          </Typography>
                          <Divider sx={{ mb: 3 }} />
                          <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<Security />}
                            onClick={handleChangePasswordClick}
                          >
                            Change Password
                          </Button>
                        </Paper>
                      </Grid>
                    </Grid>
                  </TabPanel>
                </Card>
              </Grid>
            </Grid>

            {/* Password Change Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
              <DialogTitle>Change Password</DialogTitle>
              <DialogContent>
                <TextField
                  fullWidth
                  margin="dense"
                  label="New Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!validationErrors.password}
                  helperText={validationErrors.password}
                />
                <TextField
                  fullWidth
                  margin="dense"
                  label="Confirm New Password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!!validationErrors.confirmPassword}
                  helperText={validationErrors.confirmPassword}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog} color="inherit">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} color="primary">
                  Update Password
                </Button>
              </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
              open={snackbar.open}
              autoHideDuration={6000}
              onClose={handleCloseSnackbar}
            >
              <Alert
                onClose={handleCloseSnackbar}
                severity={snackbar.severity}
                variant="filled"
                sx={{ width: '100%' }}
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
          </>
        )}
      </Box>
    </Container>
  );
};

export default Profile;