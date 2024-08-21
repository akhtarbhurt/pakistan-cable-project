import express from "express";
import { createUser, loginUser, updateUser, getUserById, deactivateUser, logoutUser, requestPasswordReset, resetPassword, fetchAllUser } from "../controllers/user.contoller.js";
import { authorizeRole } from "../middleware/verifyRole.middleware.js";

const router = express.Router();

// Public routes
router.post('/login',  loginUser);
router.post("/logout", logoutUser)
router.post('/request-password-reset', requestPasswordReset); 
router.post('/reset-password', resetPassword); 

// Protected routes
router.post('/create-user', authorizeRole(['superadmin']), createUser);
router.put('/update-user', authorizeRole(['superadmin', "user"]), updateUser);
router.get("/view-user", authorizeRole(['superadmin']), fetchAllUser)
router.get('/view-user/:userId', authorizeRole(['superadmin']), getUserById); 
router.patch('/deactivate-user', authorizeRole(['superadmin']), deactivateUser);




export default router;
