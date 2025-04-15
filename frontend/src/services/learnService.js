import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5002'}/api/learn`;

// Get all modules
const getModules = async () => {
    try {
        // Since this is a public route, we don't need authentication
        const response = await axios.get(`${API_URL}/modules?published=true`);
        return response.data;
    } catch (error) {
        console.error('Error fetching modules:', error);
        throw error.response?.data?.message || error.message;
    }
};

// Get a single module
const getModule = async (moduleId) => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
        const response = await axios.get(`${API_URL}/modules/${moduleId}`, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

// Get lessons for a module
const getLessons = async (moduleId) => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
        const response = await axios.get(`${API_URL}/lessons?moduleId=${moduleId}`, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

// Get a single lesson
const getLesson = async (lessonId) => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
        const response = await axios.get(`${API_URL}/lessons/${lessonId}`, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

// Mark a lesson as complete
const completeLesson = async (lessonId) => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
        const response = await axios.post(`${API_URL}/lessons/${lessonId}/complete`, {}, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

// Get user progress for a module
const getUserProgress = async (moduleId) => {
    try {
        const token = localStorage.getItem('userToken');
        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
        const response = await axios.get(`${API_URL}/progress/${moduleId}`, config);
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.message;
    }
};

const learnService = {
    getModules,
    getModule,
    getLessons,
    getLesson,
    completeLesson,
    getUserProgress
};

export default learnService;