import "dotenv/config"
import app from "./src/app.js"
import { createServer } from "http";
import connectDB from "./src/configs/db.js"
import { initSocket } from "./src/configs/socket.js";
import { startSubmissionWorker } from "./src/workers/submission.worker.js";
import "./src/configs/valkey.client.js";

const PORT = process.env.PORT || 5000

const start = async () => {
    // connect to database
    await connectDB()
    const httpServer = createServer(app);

    // Initialize Socket.io with Valkey adapter
    initSocket(httpServer);
    startSubmissionWorker();

    httpServer.listen(PORT, () => {
        console.log(`Server is running at ${PORT} in ${process.env.NODE_ENV} mode`)
    })
}

start().catch((err) => {
    console.error("Failed to start server", err)
    process.exit(1)
})