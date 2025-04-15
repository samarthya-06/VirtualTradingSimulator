import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';

const VideoPlayer = ({ videoId, title, description, url }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Paper
        sx={{
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 2,
          backgroundColor: '#f0f0f0',
          paddingTop: '56.25%', // 16:9 aspect ratio
          '&:hover .overlay': {
            opacity: 1
          }
        }}
        onClick={handleOpen}
      >
        <Box
          component="img"
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt={title}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
          onError={(e) => {
            // Fallback to hqdefault if mqdefault is not available
            e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }}
        />

        <Box
          className="overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.6))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.3s ease'
          }}
        >
          <IconButton
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,0,0,0.8)',
              '&:hover': {
                bgcolor: 'rgba(255,0,0,1)'
              },
              width: 60,
              height: 60,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 40 }} />
          </IconButton>
        </Box>
      </Paper>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6" noWrap sx={{ maxWidth: '80%' }}>
            {title}
          </Typography>
          <IconButton edge="end" onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0, height: 480 }}>
          <Box sx={{ position: 'relative', paddingTop: '56.25%', width: '100%' }}>
            <Box
              component="iframe"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0
              }}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        </DialogContent>

        {description && (
          <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="body2">{description}</Typography>
          </Box>
        )}

        <DialogActions>
          <Tooltip title="Open in YouTube">
            <Button
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              startIcon={<FullscreenIcon />}
            >
              Watch on YouTube
            </Button>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VideoPlayer;