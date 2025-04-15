import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/axiosConfig';

// Get all modules
export const getModules = createAsyncThunk(
  'learn/getModules',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const { category, difficulty, search } = filters;
      const queryParams = [];
      
      if (category) queryParams.push(`category=${category}`);
      if (difficulty) queryParams.push(`difficulty=${difficulty}`);
      if (search) queryParams.push(`search=${search}`);
      
      const queryString = queryParams.join('&');
      
      const response = await api.get(`/api/learn/modules?${queryString}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Get module by ID
export const getModuleById = createAsyncThunk(
  'learn/getModuleById',
  async (moduleId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/learn/modules/${moduleId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Get lesson by ID
export const getLessonById = createAsyncThunk(
  'learn/getLessonById',
  async (lessonId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/learn/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Complete lesson
export const completeLesson = createAsyncThunk(
  'learn/completeLesson',
  async ({ lessonId, quizResults }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/api/learn/lessons/${lessonId}/complete`, { quizResults });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Get user progress for a module
export const getUserProgress = createAsyncThunk(
  'learn/getUserProgress',
  async (moduleId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/learn/progress/${moduleId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const initialState = {
  modules: [],
  currentModule: null,
  currentLesson: null,
  userProgress: null,
  isLoading: false,
  error: null,
  success: false,
};

const learnSlice = createSlice({
  name: 'learn',
  initialState,
  reducers: {
    resetLearnState: (state) => {
      state.isLoading = false;
      state.error = null;
      state.success = false;
    },
    clearCurrentLesson: (state) => {
      state.currentLesson = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get modules
      .addCase(getModules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getModules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.modules = action.payload;
        state.success = true;
      })
      .addCase(getModules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get single module
      .addCase(getModuleById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getModuleById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentModule = action.payload;
        state.success = true;
      })
      .addCase(getModuleById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get single lesson
      .addCase(getLessonById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getLessonById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentLesson = action.payload;
        state.success = true;
      })
      .addCase(getLessonById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Complete lesson
      .addCase(completeLesson.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeLesson.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userProgress = action.payload;
        state.success = true;
      })
      .addCase(completeLesson.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get user progress
      .addCase(getUserProgress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserProgress.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userProgress = action.payload;
        state.success = true;
      })
      .addCase(getUserProgress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { resetLearnState, clearCurrentLesson } = learnSlice.actions;
export default learnSlice.reducer;