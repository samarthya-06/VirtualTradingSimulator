import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
    getModules,
    getModule,
    createModule,
    updateModule,
    deleteModule,
    togglePublishModule
} from '../controllers/moduleController.js';
import {
    getLessons,
    getLesson,
    createLesson,
    updateLesson,
    deleteLesson,
    completeLesson,
    getUserProgress
} from '../controllers/lessonController.js';

const router = express.Router();

// Module routes
router.route('/modules')
    .get(getModules)
    .post(protect, admin, createModule);

router.route('/modules/:id')
    .get(getModule)
    .put(protect, admin, updateModule)
    .delete(protect, admin, deleteModule);

router.route('/modules/:id/publish')
    .put(protect, admin, togglePublishModule);

// Lesson routes
router.route('/lessons')
    .get(getLessons)
    .post(protect, admin, createLesson);

router.route('/lessons/:id')
    .get(getLesson)
    .put(protect, admin, updateLesson)
    .delete(protect, admin, deleteLesson);

router.route('/lessons/:id/complete')
    .post(protect, completeLesson);

// User progress routes
router.route('/progress/:moduleId')
    .get(protect, getUserProgress);

export default router;