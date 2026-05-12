import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    pollId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poll",
        required: true,
        index: true
    },
    order:{
        type: Number,
        required: true
    },
    text:{
        type: String,
        required: true,
        trim: true,
    },
    isRequired:{
        type: Boolean,
        default: false,
    },
    options: [
    {
        id: { type: String, required: true },
        text: { type: String, required: true },
        count: { type: Number, default: 0 },
    },
    ],
},{timestamps: true});

export default mongoose.model("Question", questionSchema);