import asyncHandler from 'express-async-handler';
import Module from '../models/moduleModel.js';
import Lesson from '../models/lessonModel.js';

// @desc    Get all modules
// @route   GET /api/learn/modules
// @access  Public
export const getModules = asyncHandler(async (req, res) => {
    const { category, difficulty, published } = req.query;
    
    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (published) filter.isPublished = published === 'true';
    
    const modules = await Module.find(filter).sort({ order: 1 });
    res.status(200).json(modules);
});

// @desc    Get single module with lessons
// @route   GET /api/learn/modules/:id
// @access  Public
export const getModule = asyncHandler(async (req, res) => {
    const module = await Module.findById(req.params.id).populate({
        path: 'lessons',
        options: { sort: { order: 1 } }
    });
    
    if (!module) {
        res.status(404);
        throw new Error('Module not found');
    }
    
    res.status(200).json(module);
});

// @desc    Create new module
// @route   POST /api/learn/modules
// @access  Private/Admin
export const createModule = asyncHandler(async (req, res) => {
    const { title, description, category, difficulty, thumbnail, order } = req.body;
    
    const module = await Module.create({
        title,
        description,
        category,
        difficulty,
        thumbnail,
        order,
        createdBy: req.user._id,
    });
    
    res.status(201).json(module);
});

// @desc    Update module
// @route   PUT /api/learn/modules/:id
// @access  Private/Admin
export const updateModule = asyncHandler(async (req, res) => {
    const module = await Module.findById(req.params.id);
    
    if (!module) {
        res.status(404);
        throw new Error('Module not found');
    }
    
    const updatedModule = await Module.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedModule);
});

// @desc    Delete module
// @route   DELETE /api/learn/modules/:id
// @access  Private/Admin
export const deleteModule = asyncHandler(async (req, res) => {
    const module = await Module.findById(req.params.id);
    
    if (!module) {
        res.status(404);
        throw new Error('Module not found');
    }
    
    // Delete all lessons in this module
    await Lesson.deleteMany({ moduleId: module._id });
    
    // Delete the module
    await module.remove();
    
    res.status(200).json({ message: 'Module removed' });
});

// @desc    Publish or unpublish module
// @route   PUT /api/learn/modules/:id/publish
// @access  Private/Admin
export const togglePublishModule = asyncHandler(async (req, res) => {
    const module = await Module.findById(req.params.id);
    
    if (!module) {
        res.status(404);
        throw new Error('Module not found');
    }
    
    module.isPublished = !module.isPublished;
    await module.save();
    
    res.status(200).json(module);
});