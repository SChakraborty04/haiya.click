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
            trim: true
        },
        isAnonymous:{
            type: Boolean,
            default: false
        },
        requireAuth:{
            type: Boolean,
            default: false
        },
        expiryDate:{
            type: Date,
            required: true
        },
        isPublished:{
            type: Boolean,
            default: false
        }
    },{ timestamps: true }
)

export default mongoose.model("Poll", pollSchema)