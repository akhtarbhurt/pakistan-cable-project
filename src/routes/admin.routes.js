import express from "express"
import { adminLogin, confirmAdminLogin, disableMFA, enableMFA, recoverAdminAccount, resetAdminPassword, sendOTP, updateAdminProfile } from "../controllers/admin.controllers.js"
import { authorizeRole } from "../middleware/verifyRole.middleware.js"

const router = express.Router()

router.route("/admin-login").post(   adminLogin)
router.route("/confirm-admin-login").post(  confirmAdminLogin)
router.route("/admin-update").post( authorizeRole(['superadmin']), updateAdminProfile)
router.route("/admin-request-password-reset").post(recoverAdminAccount)
router.route("/admin-password-reset").post( resetAdminPassword)
router.route("/sendOTP").post(sendOTP)
router.route("/enableMFA").post(enableMFA)
router.route("/disableMFA").post(disableMFA)
export default router