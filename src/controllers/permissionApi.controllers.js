import prisma from "../database/db.config.js";
import { isAdmin } from "../middleware/verifyAdmin.middleware.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandlers.js";

// Create a new role
export const createRole = asyncHandler(async (req, res, next) => {
    const { roleName, permissions, userId, status } = req.body;
    //check whether the user is admin or not
    if(!isAdmin(req.user)) return next(new ApiError(401, "Access Denied"));

    if (!roleName || !userId) {
        return next(new ApiError(400, 'Role name and userId are required'));
    }

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
        return next(new ApiError(404, 'User not found'));
    }

    const newRole = await prisma.role.create({
        data: { roleName, permissions, userId, status },
    });

    return res.status(201).json(new ApiResponse(201, { role: newRole }, "Role created successfully"));
});


// fetch all roles with their permissions
export const fetchAllPermissions = asyncHandler(async (req, res, next) => {
    const roles = await prisma.role.findMany({
        select: {
            roleName: true,
            permissions: true,
            status: true,
        },
    });

    if (!roles.length) {
        return next( new ApiError(404, 'No roles found'));
    }

    return res.status(200).json(new ApiResponse(200, { roles }, "Roles and permissions fetched successfully"));
});

// update permissions for a role based on userId
export const updatePermissions = asyncHandler(async (req, res, next) => {
    const { userId, permissions } = req.body;
    //check whether the user is admin or not
    if(!isAdmin(req.user)) return next( new ApiError(401, "Access Denied"))

    if (!userId || !permissions || !permissions.length) {
        return next( new ApiError(400, 'userId and permissions are required'));
    }
    //this is checking that admin should not assign other roles than this
    const validPermissions = ["read", "write", "delete", "manage"];
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));

    if (invalidPermissions.length) {
        return next( new ApiError(400, `Invalid permissions: ${invalidPermissions.join(', ')}`));
    }

    const updatedRole = await prisma.role.updateMany({
        where: { userId },
        data: { permissions },
    });

    if (!updatedRole.count) {
        return next( new ApiError(404, 'Role not found for the given userId'));
    }

    return res.status(200).json(new ApiResponse(200, {}, "Permissions updated successfully"));
});

// Deactivate a role's permissions based on userId
export const deactivatePermissions = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if(!isAdmin(req.user)) return next( new ApiError(401, "Access Denied"))

    if (!userId) {
        return next( new ApiError(400, 'userId is required'));
    }

    const updatedRole = await prisma.role.updateMany({
        where: { userId },
        data: { status: "inactive" },
    });

    if (!updatedRole.count) {
        return next( new ApiError(404, 'Role not found for the given userId'));
    }

    return res.status(200).json(new ApiResponse(200, {}, "Role status updated to inactive successfully"));
});

// search permissions by userId
export const searchPermissionsByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return next( new ApiError(400, 'userId is required'));
    }

    const roles = await prisma.role.findMany({
        where: { userId },
        select: {
            roleName: true,
            permissions: true,
            status: true,
        },
    });

    if (!roles.length) {
        return next( new ApiError(404, 'No roles found for the given userId'));
    }

    return res.status(200).json(new ApiResponse(200, { roles }, "Roles and permissions fetched successfully"));
});
