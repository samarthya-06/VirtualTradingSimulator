import asyncHandler from 'express-async-handler';
import Lesson from '../models/lessonModel.js';
import Module from '../models/moduleModel.js';
import UserProgress from '../models/userProgressModel.js';

// @desc    Get all lessons
// @route   GET /api/learn/lessons
// @access  Public
export const getLessons = asyncHandler(async (req, res) => {
    const { moduleId, difficulty, published } = req.query;
    
    // Build filter object
    const filter = {};
    if (moduleId) filter.moduleId = moduleId;
    if (difficulty) filter.difficulty = difficulty;
    if (published) filter.isPublished = published === 'true';
    
    const lessons = await Lesson.find(filter).sort({ order: 1 });
    res.status(200).json(lessons);
});

// @desc    Get single lesson
// @route   GET /api/learn/lessons/:id
// @access  Public
export const getLesson = asyncHandler(async (req, res) => {
    const lesson = await Lesson.findById(req.params.id);
    
    if (!lesson) {
        res.status(404);
        throw new Error('Lesson not found');
    }
    
    res.status(200).json(lesson);
});

// @desc    Create new lesson
// @route   POST /api/learn/lessons
// @access  Private/Admin
export const createLesson = asyncHandler(async (req, res) => {
    const { title, description, content, moduleId, order, duration, difficulty, resources, quiz } = req.body;
    
    // Check if module exists
    const module = await Module.findById(moduleId);
    if (!module) {
        res.status(404);
        throw new Error('Module not found');
    }
    
    const lesson = await Lesson.create({
        title,
        description,
        content,
        moduleId,
        order,
        duration,
        difficulty,
        resources,
        quiz,
        createdBy: req.user._id,
    });
    
    // Update module's totalLessons and totalDuration
    module.totalLessons += 1;
    module.totalDuration += duration || 10;
    await module.save();
    
    res.status(201).json(lesson);
});

// @desc    Update lesson
// @route   PUT /api/learn/lessons/:id
// @access  Private/Admin
export const updateLesson = asyncHandler(async (req, res) => {
    const lesson = await Lesson.findById(req.params.id);
    
    if (!lesson) {
        res.status(404);
        throw new Error('Lesson not found');
    }
    
    // If duration is being updated, update the module's totalDuration
    if (req.body.duration && req.body.duration !== lesson.duration) {
        const module = await Module.findById(lesson.moduleId);
        if (module) {
            module.totalDuration = module.totalDuration - lesson.duration + req.body.duration;
            await module.save();
        }
    }
    
    const updatedLesson = await Lesson.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedLesson);
});

// @desc    Delete lesson
// @route   DELETE /api/learn/lessons/:id
// @access  Private/Admin
export const deleteLesson = asyncHandler(async (req, res) => {
    const lesson = await Lesson.findById(req.params.id);
    
    if (!lesson) {
        res.status(404);
        throw new Error('Lesson not found');
    }
    
    // Update module's totalLessons and totalDuration
    const module = await Module.findById(lesson.moduleId);
    if (module) {
        module.totalLessons = Math.max(0, module.totalLessons - 1);
        module.totalDuration = Math.max(0, module.totalDuration - (lesson.duration || 0));
        await module.save();
    }
    
    // Remove lesson from user progress records
    await UserProgress.updateMany(
        { 'completedLessons.lessonId': lesson._id },
        { $pull: { completedLessons: { lessonId: lesson._id } } }
    );
    
    await lesson.remove();
    
    res.status(200).json({ message: 'Lesson removed' });
});

// @desc    Mark lesson as completed
// @route   POST /api/learn/lessons/:id/complete
// @access  Private
export const completeLesson = asyncHandler(async (req, res) => {
    const { quizResults } = req.body;
    const lessonId = req.params.id;
    
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
        res.status(404);
        throw new Error('Lesson not found');
    }
    
    // Find or create user progress record
    let userProgress = await UserProgress.findOne({
        userId: req.user._id,
        moduleId: lesson.moduleId
    });
    
    if (!userProgress) {
        userProgress = await UserProgress.create({
            userId: req.user._id,
            moduleId: lesson.moduleId,
            completedLessons: [],
            moduleCompleted: false
        });
    }
    
    // Check if lesson is already completed
    const lessonCompleted = userProgress.completedLessons.find(
        (item) => item.lessonId.toString() === lessonId
    );
    
    if (!lessonCompleted) {
        // Add lesson to completed lessons
        userProgress.completedLessons.push({
            lessonId,
            completedAt: Date.now(),
            quizResults
        });
        
        // Update lastAccessedAt
        userProgress.lastAccessedAt = Date.now();
        
        // Check if all lessons in module are completed
        const module = await Module.findById(lesson.moduleId);
        const allLessons = await Lesson.find({ moduleId: lesson.moduleId });
        
        if (userProgress.completedLessons.length === allLessons.length) {
            userProgress.moduleCompleted = true;
            userProgress.moduleCompletedAt = Date.now();
        }
        
        await userProgress.save();
    } else if (quizResults) {
        // Update quiz results if provided
        const lessonIndex = userProgress.completedLessons.findIndex(
            (item) => item.lessonId.toString() === lessonId
        );
        
        if (lessonIndex !== -1) {
            userProgress.completedLessons[lessonIndex].quizResults = quizResults;
            await userProgress.save();
        }
    }
    
    res.status(200).json(userProgress);
});

// @desc    Get user progress for a module
// @route   GET /api/learn/progress/:moduleId
// @access  Private
export const getUserProgress = asyncHandler(async (req, res) => {
    const moduleId = req.params.moduleId;
    
    const userProgress = await UserProgress.findOne({
        userId: req.user._id,
        moduleId
    }).populate('completedLessons.lessonId');
    
    if (!userProgress) {
        return res.status(200).json({
            userId: req.user._id,
            moduleId,
            completedLessons: [],
            moduleCompleted: false
        });
    }
    
    res.status(200).json(userProgress);
});