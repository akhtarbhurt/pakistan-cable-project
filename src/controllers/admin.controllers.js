import prisma from "../database/db.config.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandlers.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import speakeasy from "speakeasy";
import { generateToken, setTokenCookie } from "../utils/tokenAndCookie.js";

async function createAdmin() {
    try {
        const adminExists = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
        if (!adminExists) {
            const hashedPassword = await hashPassword("adminpassword");
            await prisma.user.create({
                data: {
                    userName: "Admin",
                    email: "admin@example.com",
                    position: "Administrator",
                    department: "System",
                    role: "superadmin",
                    password: hashedPassword,
                    status: "active",
                    deviceTypes: [{ web: "", iOS: "", android: "" }],
                },
            });
        }
    } catch (error) {
        console.error("Error creating admin:", error);
        process.exit(1);
    }
}

if (process.env.NODE_ENV !== 'production') {
    createAdmin();
}

async function updateUserProfile(userId, data) {
    return prisma.user.update({
        where: { id: userId },
        data,
    });
}

async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

async function findAdminByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
}

async function sendOTPEmail(user, otp) {
    await sendEmail({
        email: user.email,
        subject: "Your OTP Code",
        message: `Your OTP code is: ${otp}`,
    });
}

export const enableMFA = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const admin = await findAdminByEmail(email);

    if (!admin) {
        return next(new ApiError(404, "Admin not found"));
    }

    const secret = speakeasy.generateSecret({ name: "YourAppName" });
    await prisma.user.update({
        where: { email },
        data: {
            mfaSecret: secret.base32,
            mfaEnabled: true,
        },
    });

    res.status(200).json(new ApiResponse(200, { secret: secret.otpauth_url }, "MFA enabled successfully"));
});

export const disableMFA = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const admin = await findAdminByEmail(email);

    if (!admin) {
        return next(new ApiError(404, "Admin not found"));
    }

    await prisma.user.update({
        where: { email },
        data: {
            mfaEnabled: false,
            mfaSecret: null,
        },
    });

    res.status(200).json(new ApiResponse(200, {}, "MFA disabled successfully"));
});

export const updateAdminProfile = asyncHandler(async (req, res, next) => {
    const { adminId, name, email, password } = req.body;

    if (req.user.id !== adminId) {
        return next(new ApiError(403, "You can only update your own profile"));
    }

    const updatedData = {};
    if (name) updatedData.userName = name;
    if (email) updatedData.email = email;
    if (password) updatedData.password = await hashPassword(password);

    await updateUserProfile(adminId, updatedData);

    res.status(200).json(new ApiResponse(200, null, "Profile updated successfully"));
});

export const recoverAdminAccount = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const admin = await findAdminByEmail(email);

    if (!admin) {
        return next(new ApiError(404, "Admin not found"));
    }

    const recoveryToken = crypto.randomBytes(32).toString("hex");
    await updateUserProfile(admin.id, { resetPasswordToken: recoveryToken });

    const recoveryUrl = `${process.env.FRONTEND_URL}/reset-password?token=${recoveryToken}`;
    await sendEmail({ email: admin.email, subject: "Admin Account Recovery", message: `Click the following link to reset your password: ${recoveryUrl}` });

    res.status(200).json(new ApiResponse(200, null, "Recovery email sent"));
});

export const resetAdminPassword = asyncHandler(async (req, res, next) => {
    const { token, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return next(new ApiError(400, "Passwords do not match"));
    }

    const admin = await prisma.user.findFirst({ where: { resetPasswordToken: token } });

    if (!admin) {
        return next(new ApiError(400, "Invalid token"));
    }

    const hashedPassword = await hashPassword(newPassword);
    await updateUserProfile(admin.id, { password: hashedPassword, resetPasswordToken: null });

    res.status(200).json(new ApiResponse(200, null, "Password reset successfully"));
});

export const adminLogin = asyncHandler(async (req, res, next) => {
    const { email, password, otp } = req.body;

    if (!email || !password) {
        return next(new ApiError(400, "Email and password are required"));
    }

    const user = await findAdminByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new ApiError(401, "Invalid credentials"));
    }

    const clientIp = req.ip;
    const isIpRecognized = user.deviceTypes.some((device) => device.web === clientIp);

    if (user.mfaEnabled && !otp) {
        const generatedOtp = speakeasy.totp({ secret: user.mfaSecret, encoding: "base32" });
        await updateUserProfile(user.id, { otpCode: generatedOtp, otpExpiry: new Date(Date.now() + 5 * 60 * 1000) });
        await sendOTPEmail(user, generatedOtp);

        return next(new ApiError(401, "OTP sent to your email. Please enter the OTP to continue."));
    }

    if (user.mfaEnabled && otp) {
        const verified = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: "base32", token: otp, window: 2 });

        if (!verified) {
            return next(new ApiError(401, "Invalid OTP"));
        }
    }

    if (!isIpRecognized) {
        const confirmationToken = crypto.randomBytes(32).toString("hex");
        const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

        await updateUserProfile(user.id, { loginAttempt: confirmationToken, tokenExpiry, unrecognizedBrowser: clientIp });

        const confirmUrl = `${process.env.FRONTEND_URL}/confirm-login?token=${confirmationToken}`;
        await sendEmail({ email: user.email, subject: "Unrecognized Login Attempt - Confirmation Required", message: `Dear ${user.userName}, A login attempt was detected from an unrecognized IP address: ${clientIp}. Confirm: <a href="${confirmUrl}">Yes, it's me</a>` });

        return res.status(401).json(new ApiResponse(401, null, "Login attempt from unrecognized IP address. Confirmation required."));
    }

    const token = generateToken(user.id, user.userName, user.role);
    setTokenCookie(res, token);
    res.status(200).json(new ApiResponse(200, { token }, "Login successful"));
});

export const confirmAdminLogin = asyncHandler(async (req, res, next) => {
    const { token } = req.query;
    const user = await prisma.user.findFirst({ where: { loginAttempt: token, tokenExpiry: { gte: new Date() } } });

    if (!user) {
        return next(new ApiError(400, "Invalid or expired confirmation token"));
    }

    const deviceTypes = [...user.deviceTypes, { web: user.unrecognizedBrowser }];
    await updateUserProfile(user.id, { loginAttempt: null, tokenExpiry: null, unrecognizedBrowser: null, deviceTypes: { set: deviceTypes } });

    const jwtToken = generateToken(user.id, user.role);
    setTokenCookie(res, jwtToken);
    res.status(200).json(new ApiResponse(200, { token: jwtToken }, "Login confirmed and successful"));
});

export const sendOTP = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const admin = await findAdminByEmail(email);

    if (!admin || !admin.mfaEnabled) {
        return next(new ApiError(400, "Admin not found or MFA not enabled"));
    }

    const otp = speakeasy.totp({ secret: admin.mfaSecret, encoding: "base32" });
    await updateUserProfile(admin.id, { otpCode: otp, otpExpiry: new Date(Date.now() + 5 * 60 * 1000) });
    await sendOTPEmail(admin, otp);

    res.status(200).json(new ApiResponse(200, null, "OTP queued for sending"));
});
