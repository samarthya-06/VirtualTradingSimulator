import mongoose from 'mongoose';

const userProgressSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Module',
            required: true,
        },
        completedLessons: [
            {
                lessonId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Lesson',
                },
                completedAt: {
                    type: Date,
                    default: Date.now,
                },
                quizResults: {
                    score: Number,
                    totalQuestions: Number,
                    correctAnswers: Number,
                    completedAt: Date,
                },
            },
        ],
        moduleCompleted: {
            type: Boolean,
            default: false,
        },
        moduleCompletedAt: Date,
        lastAccessedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Add indexes for faster lookups
userProgressSchema.index({ userId: 1, moduleId: 1 }, { unique: true }); // Ensure one progress record per user per module
userProgressSchema.index({ userId: 1, 'completedLessons.lessonId': 1 }); // For checking if a user completed a specific lesson
userProgressSchema.index({ userId: 1, moduleCompleted: 1 }); // For finding completed modules for a user

export default mongoose.model('UserProgress', userProgressSchema);