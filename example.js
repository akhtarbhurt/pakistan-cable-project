
//for practice purpose


export const createTeam = asyncHandler(async (req, res, next) => {
    const { teamName, teamDescription, region, members, visualRepresentation, subteam, teamLeader, reportingLines, teamPerformance, teamActivityLogs } = req.body;

    // Validate the members
    const validMembers = await prisma.user.findMany({
        where: { id: { in: members } },
        select: { id: true }
    });

    if (validMembers.length !== members.length) {
        return next(new ApiError(400, 'One or more members are invalid.'));
    }

    // Validate the subteam
    const validSubteam = await prisma.user.findMany({
        where: { id: { in: subteam } },
        select: { id: true }
    });

    if (validSubteam.length !== subteam.length) {
        return next(new ApiError(400, 'One or more subteam entries are invalid.'));
    }

    // Validate the structure of teamPerformance
    if (teamPerformance) {
        const isValidTeamPerformance = teamPerformance.every(performance =>
            typeof performance.metric === 'string' && typeof performance.value === 'number'
        );

        if (!isValidTeamPerformance) {
            return next(new ApiError(400, 'Invalid team performance structure.'));
        }
    }

    // Validate the structure of teamActivityLogs
    if (teamActivityLogs) {
        const isValidTeamActivityLogs = teamActivityLogs.every(log =>
            typeof log.date === 'string' && typeof log.activity === 'string'
        );

        if (!isValidTeamActivityLogs) {
            return next(new ApiError(400, 'Invalid team activity logs structure.'));
        }
    }

    const token = req.cookies.accessToken;
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const newTeam = await prisma.teamManagement.create({
        data: {
            teamName,
            teamDescription,
            region,
            members: {
                connect: validMembers.map(member => ({ id: member.id }))
            },
            visualRepresentation: visualRepresentation || "default value",
            teamLeader: decoded.userName,
            teamPerformance,
            teamActivityLogs,
            reportingLines,
            status: "active",
            subteam: {
                connect: validSubteam.map(team => ({ id: team.id }))
            }
        },
    });

    return res.status(201).json(new ApiResponse(201, { teamId: newTeam.id }, "Team created successfully"));
});