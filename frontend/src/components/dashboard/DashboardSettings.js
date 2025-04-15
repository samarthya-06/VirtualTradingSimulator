import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  FormGroup,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Settings,
  Close,
  DragIndicator,
  Save,
  Restore
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Default widgets configuration
const DEFAULT_WIDGETS = [
  { id: 'portfolio-summary', label: 'Portfolio Summary', enabled: true, order: 1 },
  { id: 'market-overview', label: 'Market Overview', enabled: true, order: 2 },
  { id: 'performance-chart', label: 'Performance Chart', enabled: true, order: 3 },
  { id: 'recent-trades', label: 'Recent Trades', enabled: true, order: 4 },
  { id: 'market-news', label: 'Market News', enabled: true, order: 5 }
];

const DashboardSettings = () => {
  const [open, setOpen] = useState(false);
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [isModified, setIsModified] = useState(false);

  // Load saved widget configuration when component mounts
  useEffect(() => {
    const savedWidgets = localStorage.getItem('dashboardWidgets');
    if (savedWidgets) {
      try {
        const parsedWidgets = JSON.parse(savedWidgets);
        setWidgets(parsedWidgets);
      } catch (error) {
        console.error('Error parsing saved dashboard widgets:', error);
      }
    }
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleToggleWidget = (id) => {
    setWidgets(widgets.map(widget =>
      widget.id === id ? { ...widget, enabled: !widget.enabled } : widget
    ));
    setIsModified(true);
  };

  const handleSaveChanges = () => {
    // Save widget configuration to localStorage
    localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
    setIsModified(false);
    handleClose();
    // Refresh dashboard to reflect changes
    window.location.reload();
  };

  const handleResetDefaults = () => {
    // Reset to default widgets
    setWidgets(DEFAULT_WIDGETS);
    setIsModified(true);

    // Also update localStorage to ensure consistency
    localStorage.setItem('dashboardWidgets', JSON.stringify(DEFAULT_WIDGETS));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order property based on new positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setWidgets(updatedItems);
    setIsModified(true);
  };

  return (
    <>
      <Tooltip title="Dashboard Settings">
        <IconButton onClick={handleOpen} color="primary">
          <Settings />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Dashboard Settings</Typography>
            <IconButton onClick={handleClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Customize your dashboard by enabling, disabling, or reordering widgets.
          </Typography>

          <Box mt={2}>
            <FormGroup>
              <Typography variant="subtitle2" gutterBottom>
                Visible Widgets:
              </Typography>
              <Divider />

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="widgets">
                  {(provided) => (
                    <List
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      sx={{ width: '100%' }}
                    >
                      {widgets
                        .sort((a, b) => a.order - b.order)
                        .map((widget, index) => (
                          <Draggable key={widget.id} draggableId={widget.id} index={index}>
                            {(provided) => (
                              <ListItem
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                dense
                                sx={{
                                  bgcolor: 'background.paper',
                                  mb: 1,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 1
                                }}
                              >
                                <Box {...provided.dragHandleProps} sx={{ display: 'flex', mr: 1 }}>
                                  <DragIndicator color="action" />
                                </Box>
                                <ListItemText primary={widget.label} />
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={widget.enabled}
                                      onChange={() => handleToggleWidget(widget.id)}
                                    />
                                  }
                                  label=""
                                />
                              </ListItem>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </DragDropContext>
            </FormGroup>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleResetDefaults}
            color="secondary"
            startIcon={<Restore />}
          >
            Reset to Default
          </Button>
          <Button
            onClick={handleSaveChanges}
            variant="contained"
            color="primary"
            disabled={!isModified}
            startIcon={<Save />}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DashboardSettings;