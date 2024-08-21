import express from "express"
import { createRole, deactivatePermissions,  fetchAllPermissions,  searchPermissionsByUserId,  updatePermissions } from "../controllers/permissionApi.controllers.js";
import { authorizeRole } from "../middleware/verifyRole.middleware.js";
const router = express.Router()

// Add these routes to your existing router setup
router.route("/create-roles").post( authorizeRole(['superadmin']), createRole)
router.get('/roles', authorizeRole(['superadmin']), fetchAllPermissions );
router.patch('/roles/permissions', authorizeRole(['superadmin']), updatePermissions);
router.route("/deactivate-permissions").patch( authorizeRole(['superadmin']), deactivatePermissions)
router.get('/roles/user/:userId', authorizeRole(['superadmin']), searchPermissionsByUserId);

export default router