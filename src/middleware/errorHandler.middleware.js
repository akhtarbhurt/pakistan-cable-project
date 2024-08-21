function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }
    
    // Default to 500 if no status code is set
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        statusCode,
        message: err.message || 'Internal Server Error',
        errors: err.errors || [],
    });
}

export default errorHandler