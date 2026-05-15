import mongoose from "mongoose";

const responseSchema = new mongoose.Schema({
    pollId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poll",
        required: true
    },
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    fingerprint:{
        type: String,
        required: false
    },
    answers:[
        {
            questionId:{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Question",
                required: true
            },
            optionId:{
                type: String,
                required: true
            }
        }
    ]
},{timestamps: true});

export default mongoose.model("Response", responseSchema);