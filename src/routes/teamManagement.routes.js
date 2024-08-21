import express from "express"
import { createTeam, getTeam, organizeTeamsByRegion, performanceReportingAPI, searchAndFilterTeams, searchTeamById, teamHierarchyView, updateTeam } from "../controllers/teamManagement.controller.js"
import { authorizeRole } from "../middleware/verifyRole.middleware.js"
const router = express.Router()

router.route("/create-team").post(  authorizeRole(['manager', "superadmin"]), createTeam)
router.route("/view-team").get( authorizeRole(['manager', 'superadmin']), getTeam)
router.route("/update-team").put( authorizeRole(['manager', 'superadmin']), updateTeam)
router.route("/view-team/:id").get(  authorizeRole(['manager', 'superadmin']), searchTeamById)
router.route("/organize-teams-by-region").get(authorizeRole(['manager', 'superadmin']), organizeTeamsByRegion);
router.route("/search-team").get(authorizeRole(['manager']), searchAndFilterTeams);
router.route("/team-performance-reporting/:id").get( authorizeRole(['manager', 'superadmin']), performanceReportingAPI)
router.route("/team-hierarchy/:teamId").get( authorizeRole(['manager', 'superadmin']), teamHierarchyView)

export default router