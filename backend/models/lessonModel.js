import mongoose from 'mongoose';

const lessonSchema = mongoose.Schema(
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
        content: {
            type: String,
            required: [true, 'Please add content'],
        },
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Module',
            required: true,
        },
        order: {
            type: Number,
            required: true,
            default: 0,
        },
        duration: {
            type: Number, // in minutes
            required: true,
            default: 10,
        },
        difficulty: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner',
        },
        resources: [
            {
                title: String,
                url: String,
                type: {
                    type: String,
                    enum: ['article', 'video', 'pdf', 'link'],
                    default: 'link',
                },
            },
        ],
        quiz: [
            {
                question: String,
                options: [String],
                correctAnswer: Number, // Index of the correct option
                explanation: String,
            },
        ],
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
    }
);

// Add indexes for faster lookups
lessonSchema.index({ moduleId: 1, order: 1 }); // For sorting lessons within a module
lessonSchema.index({ difficulty: 1 }); // For filtering by difficulty
lessonSchema.index({ isPublished: 1 }); // For filtering published lessons

export default mongoose.model('Lesson', lessonSchema);