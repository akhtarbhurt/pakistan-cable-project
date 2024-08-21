import express from "express"
import cookieParser from "cookie-parser"

const app = express()

app.use(express())
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(cookieParser())


//import route here
import user from "./routes/user.route.js"
import permissionApi from "./routes/permissionApi.routes.js"
import admin from "./routes/admin.routes.js"
import teamManagement from "./routes/teamManagement.routes.js"

app.use("/api", user)
app.use("/api", permissionApi)
app.use("/api", admin)
app.use("/api", teamManagement)

//error handling route
import errorHandler from "./middleware/errorHandler.middleware.js"
app.use(errorHandler)

export {app}
