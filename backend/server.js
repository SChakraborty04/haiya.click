import "dotenv/config"
import app from "./src/app.js"
import connectDB from "./src/configs/db.js"

const PORT = process.env.PORT || 5000

const start = async () => {
    // connect to database
    await connectDB()
    //init valkey connection
    if (process.env.NODE_ENV === "production") {
        await import("./src/configs/valkey.js")
    } else {
        await import("./src/configs/valkey.render.js")
    }
    app.listen(PORT, () => {
        console.log(`Server is running at ${PORT} in ${process.env.NODE_ENV} mode`)
    })
}

start().catch((err) => {
    console.error("Failed to start server", err)
    process.exit(1)
})