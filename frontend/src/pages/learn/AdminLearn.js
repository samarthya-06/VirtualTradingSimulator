import React from 'react';
import { Box, Typography, Divider, Container, Paper, Alert } from '@mui/material';
import { useSelector } from 'react-redux';
import AddModuleForm from '../../components/learn/AddModuleForm';
import ModuleList from '../../components/learn/ModuleList';

const AdminLearn = () => {
  const { user } = useSelector((state) => state.auth);
  
  // Check if user is admin
  if (!user || !user.isAdmin) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            You do not have permission to access this page. Admin privileges required.
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Learning Module Management
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create and manage learning modules for users to enhance their trading knowledge.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Add Module Form */}
        <AddModuleForm />
        
        <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ mt: 4 }}>
          Existing Modules
        </Typography>
        
        {/* List of existing modules */}
        <ModuleList />
      </Box>
    </Container>
  );
};

export default AdminLearn;