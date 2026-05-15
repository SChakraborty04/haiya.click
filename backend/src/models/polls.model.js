import mongoose from "mongoose";

const pollSchema = new mongoose.Schema(
    {
        creatorId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        title:{
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        slug:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index:true
        },
        isAnonymous:{
            type: Boolean,
            default: false
        },
        requireAuth:{
            type: Boolean,
            default: false
        },
        duration:{
            type: Number, // in seconds
            required: true
        },
        expiryDate:{
            type: Date,
            // required: true // Removed required because it will be calculated on start
        },
        isStarted:{
            type: Boolean,
            default: false
        },
        isPublished:{
            type: Boolean,
            default: false
        },
        resultsReady:{
            type: Boolean,
            default: false
        },
        views: {
            type: Number,
            default: 0
        },
        maxConcurrentUsers: {
            type: Number,
            default: 0
        },
        totalVoters: {
            type: Number,
            default: 0
        },
        startedAt: {
            type: Date
        }
    },{ timestamps: true }
)

export default mongoose.model("Poll", pollSchema)