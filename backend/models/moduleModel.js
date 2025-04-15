import mongoose from 'mongoose';

const moduleSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a title'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Please add a description'],
        },
        category: {
            type: String,
            enum: ['basics', 'technical-analysis', 'fundamental-analysis', 'strategies', 'risk-management', 'advanced'],
            required: true,
        },
        order: {
            type: Number,
            required: true,
            default: 0,
        },
        thumbnail: {
            type: String,
            default: '/assets/images/module-default.jpg',
        },
        totalLessons: {
            type: Number,
            default: 0,
        },
        totalDuration: {
            type: Number, // in minutes
            default: 0,
        },
        difficulty: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner',
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual field to get lessons in this module
moduleSchema.virtual('lessons', {
    ref: 'Lesson',
    localField: '_id',
    foreignField: 'moduleId',
    options: { sort: { order: 1 } },
});

// Add indexes for faster lookups
moduleSchema.index({ category: 1 }); // For filtering by category
moduleSchema.index({ difficulty: 1 }); // For filtering by difficulty
moduleSchema.index({ isPublished: 1 }); // For filtering published modules
moduleSchema.index({ order: 1 }); // For sorting modules

export default mongoose.model('Module', moduleSchema);