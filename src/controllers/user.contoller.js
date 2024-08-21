import prisma from "../database/db.config.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandlers.js";
import bcrypt from "bcrypt";
import crypto from 'crypto';
import { sendEmail } from "../utils/sendEmail.js";
import { isAdmin } from "../middleware/verifyAdmin.middleware.js";
import { generateToken, setTokenCookie } from "../utils/tokenAndCookie.js";

// Middleware to check admin access 
const ensureAdmin = (req, res, next) => {
    if (!isAdmin(req.user)) {
        return next(new ApiError(403, "Access Denied"));
    }
    next();
};

// Utility function to hash passwords
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Create a new user
export const createUser = asyncHandler(async (req, res, next) => {
    const { userName, email, position, department, role, password, status } = req.body;

    if (!email) {
        return next(new ApiError(400, 'Email is required'));
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return next(new ApiError(409, "Email already exists, please try another email"));
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
        data: { userName, email, position, department, role, password: hashedPassword, status }
    });

    return res.status(201).json(new ApiResponse(201, { userId: user.id }, "User created successfully"));
});

// Fetch all users with their roles
export const fetchAllUser = asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
        include: {
            roles: {
                select: {
                    roleName: true,
                    permissions: true
                }
            }
        }
    });

    const userData = users.map(user => ({
        id: user.id,
        userName: user.userName,
        email: user.email,
        position: user.position,
        department: user.department,
        role: user.role,
        status: user.status,
        roles: user.roles
    }));

    return res.status(200).json(new ApiResponse(200, userData, "Data found successfully"));
});

// User login
export const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new ApiError(401, 'Invalid email or password'));
    }

    if(isAdmin(user)) {
        return next(new ApiError(401, "Admin cannot login from user route"));
    }

    const token = generateToken(user.id, user.userName, user.role);
    setTokenCookie(res, token);

    return res.status(200).json(new ApiResponse(200, { token }, 'Login successful'));
});

// Update user profile
export const updateUser = asyncHandler(async (req, res, next) => {
    const { userId, userName, email, position, department, role, status } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== userId) {
        return next(new ApiError(409, 'Email is already in use by another account'));
    }

    await prisma.user.update({
        where: { id: userId },
        data: { userName, email, position, department, role, status },
    });

    return res.status(200).json(new ApiResponse(200, { message: 'User updated successfully' }));
});

// Deactivate a user
export const deactivateUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return next(new ApiError(404, 'User not found'));
    }

    await prisma.user.update({
        where: { id: userId },
        data: { status: 'inactive' }
    });

    return res.status(200).json(new ApiResponse(200, { message: 'User deactivated successfully' }));
});

// get user by ID
export const getUserById = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: {
                select: {
                    roleName: true,
                    permissions: true
                }
            }
        }
    });

    if (!user) {
        return next(new ApiError(404, 'User not found'));
    }

    const { userName, email, position, department, role, status, roles } = user;
    return res.status(200).json(new ApiResponse(200, { userName, email, position, department, role, status, roles }));
});

// logout user
export const logoutUser = asyncHandler(async (req, res) => {
    try {
        res.clearCookie("accessToken", { httpOnly: true, secure: true });
        return res.status(200).json(new ApiResponse(200, {}, "Logout successful"));
    } catch (error) {
        console.error("Failed to logout", error);
        return res.status(500).json(new ApiResponse(500, {}, 'Logout unsuccessful'));
    }
});

// request password reset
export const requestPasswordReset = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return next(new ApiError(404, 'User with this email does not exist'));
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
        where: { email },
        data: { resetPasswordToken, resetPasswordExpires }
    });

    const message = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset',
            message: `You requested a password reset. Please go to this link to reset your password: ${message}`
        });

        return res.status(200).json(new ApiResponse(200, { message: 'Email sent' }));
    } catch (error) {
        console.error("Error sending email:", error);
        return next(new ApiError(500, 'Email could not be sent'));
    }
});

// Reset password
export const resetPassword = asyncHandler(async (req, res, next) => {
    const { token, newPassword, confirmPassword } = req.body;

    if(newPassword !== confirmPassword) {
        return next(new ApiError(400, "Passwords do not match"));
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
        where: {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { gt: new Date() }
        }
    });

    if (!user) {
        return next(new ApiError(400, 'Token is invalid or has expired'));
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        }
    });

    return res.status(200).json(new ApiResponse(200, { message: 'Password reset successfully' }));
});
