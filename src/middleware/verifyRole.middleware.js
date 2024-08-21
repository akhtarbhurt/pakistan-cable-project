import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import prisma from '../database/db.config.js';

export const authorizeRole = (roles) => {
  return async (req, res, next) => {
    let token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    console.log("Token extracted from request:", token); // Debug line

    if (!token) {
      return next(new ApiError(401, 'Access token is required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      console.log("Decoded token:", decoded); // Debug line

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user) {
        return next(new ApiError(401, 'User not found'));
      }

      req.user = user;

      if (!roles.includes(user.role)) {
        return next(new ApiError(403, 'Forbidden'));
      }

      next();
    } catch (error) {
      console.error("Token verification failed:", error);
      next(new ApiError(401, 'Invalid or expired token'));
    }
  };
};

