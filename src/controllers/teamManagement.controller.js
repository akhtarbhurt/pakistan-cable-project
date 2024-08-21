import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandlers.js";
import prisma from "../database/db.config.js";
import jwt from "jsonwebtoken"

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
    
    // validate the structure of teamPerformance
    if (teamPerformance) {
        const isValidTeamPerformance = teamPerformance.every(performance =>
            typeof performance.metric === 'string' && typeof performance.value === 'number'
        );

        if (!isValidTeamPerformance) {
            return next(new ApiError(400, 'Invalid team performance structure.'));
        }
    }

    // validate the structure of teamActivityLogs
    if (teamActivityLogs) {
        const isValidTeamActivityLogs = teamActivityLogs.every(log =>
            typeof log.date === 'string' && typeof log.activity === 'string'
        );

        if (!isValidTeamActivityLogs) {
            return next(new ApiError(400, 'Invalid team activity logs structure.'));
        }
    }
    const user = await prisma.user.findMany()
    const filterUser = user.filter((elem)=>  elem.role === "manager" )
    //get the teamLeader from session
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
            visualRepresentation: visualRepresentation || "default value", //suppose if there is no value
            teamLeader: decoded.userName, //teamLeader will create itself here via session
            teamPerformance,
            teamActivityLogs,
            reportingLines,
            status: "active",
            subteam: {
                connect: filterUser.map(team => ({ id: team.id }))
            }
        },
    });

    return res.status(201).json(new ApiResponse(201, { teamId: newTeam.id }, "Team created successfully"));
});

export const getTeam = asyncHandler(async(req, res)=>{
    const payload = await prisma.teamManagement.findMany({
        select:{
            id: true,
            teamName: true,
            teamDescription: true,
            region: true,
            members: {
                select: {
                    id: true,
                    userName: true,
                    email: true,
                }
            },
            
        }
    })

    return res.status(200).json(new ApiResponse(200, payload, "Successfully created team"));
});

//update the team management profile

export const updateTeam = asyncHandler(async (req, res, next) => {
    const { teamId, teamName, teamDescription, region, members } = req.body;
    
    // validate team existence
    const existingTeam = await prisma.teamManagement.findUnique({
        where: { id: teamId },
    });

    if (!existingTeam) {
        return next(new ApiError(404, 'Team not found.'));
    }

    // process members to add
    const membersToAdd = members?.add || [];
    const validMembersToAdd = await prisma.user.findMany({
        where: { id: { in: membersToAdd } },
        select: { id: true }
    });

    if (validMembersToAdd.length !== membersToAdd.length) {
        return next(new ApiError(400, 'One or more members to add are invalid.'));
    }

    // Process members to remove
    const membersToRemove = members?.remove || [];
    const validMembersToRemove = await prisma.user.findMany({
        where: { id: { in: membersToRemove } },
        select: { id: true }
    });

    if (validMembersToRemove.length !== membersToRemove.length) {
        return next(new ApiError(400, 'One or more members to remove are invalid.'));
    }

    // update the team with the new details and members
    await prisma.teamManagement.update({
        where: { id: teamId },
        data: {
            teamName,
            teamDescription,
            region,
            members: {
                connect: validMembersToAdd.map(member => ({ id: member.id })),
                disconnect: validMembersToRemove.map(member => ({ id: member.id })),
            },
        },
    });

    return res.status(200).json(new ApiResponse(200, {}, "Team updated successfully"));
});

//search team management by api
export const searchTeamById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // Check if ID is provided
    if (!id) {
        return next(new ApiError(400, "ID parameter is required."));
    }

    // Find the team by ID
    const team = await prisma.teamManagement.findUnique({
        where: { id }, 
        select: {
            id: true,
            teamName: true,
            teamDescription: true,
            region: true,
            members: {
                select: {
                    id: true,
                    userName: true,
                    email: true,
                }
            }
        }
    });

    if (!team) {
        return next(new ApiError(404, "No team exists with this ID"));
    }

    return res.status(200).json(new ApiResponse(200, team, "Team retrieved successfully"));
});


// search the team by region
export const organizeTeamsByRegion = asyncHandler(async (req, res, next) => {
    const { regionName } = req.query;

    // validate the regionName parameter
    if (!regionName) {
        return next(new ApiError(400, "regionName parameter is required."));
    }

    // Find teams in the specified region
    const teams = await prisma.teamManagement.findMany({
        where: { region: regionName },
        select: {
            id: true,
            teamName: true,
            teamDescription: true,
            region: true,
            members: {
                select: {
                    id: true,
                    userName: true,
                    email: true,
                }
            }
        }
    });

    if (!teams.length) {
        return res.status(404).json(new ApiResponse(404, [], "No teams found matching the criteria."));
    }

    return res.status(200).json(new ApiResponse(200, teams, `Teams in region ${regionName} retrieved successfully`));
});

//it is searcing and filtering the team management data
export const searchAndFilterTeams = asyncHandler(async (req, res, next) => {
    const { teamName, region, memberId, limit, offset } = req.query;

    // convert limit and offset to integers and set default values if there is no value available
    const take = parseInt(limit) || 10;  
    const skip = parseInt(offset) || 0;  

    // build the filter criteria
    const filterCriteria = {};

    if (teamName) {
        filterCriteria.teamName = { contains: teamName, mode: "insensitive" };
    }

    if (region) {
        filterCriteria.region = { contains: region, mode: "insensitive" };
    }

    if (memberId) {
        filterCriteria.members = {
            some: {
                id: memberId,
            },
        };
    }

    try {
        // fetch the teams based on the filter criteria with pagination
        //using the try catch to handle the error
        const teams = await prisma.teamManagement.findMany({
            where: filterCriteria,
            take,
            skip,
            select: {
                id: true,
                teamName: true,
                region: true,
                members: {
                    select: {
                        id: true,
                        userName: true,
                        email: true,
                    },
                },
            },
        });

        if (teams.length === 0) {
            return res.status(404).json(new ApiResponse(404, [], "No teams found matching the criteria."));
        }

        // fetch the total count of teams matching the filter criteria for pagination info
        const totalTeams = await prisma.teamManagement.count({
            where: filterCriteria,
        });

        return res.status(200).json(new ApiResponse(200, {
            teams,
            pagination: {
                totalTeams,
                limit: take,
                offset: skip,
            }
        }, "Teams retrieved successfully"));
    } catch (error) {
        return next(new ApiError(500, 'An error occurred while retrieving teams.'));
    }
});

//team performance reporting 
export const performanceReportingAPI = asyncHandler(async(req, res, next)=>{
    const {id} = req.params
    if(!id){
        return next(new ApiError(404, "id is required"))
    }
    const payload = await prisma.teamManagement.findMany({
        where:{id},
        select:{
            teamPerformance: true,
            teamActivityLogs: true
        }
    })

    if(!payload.length) return next(new ApiError(404, "no data found in database"))

    return res.status(200).json(new ApiResponse(200, payload, "data get successfully"))

})


// it tells the team hierarchy 
export const teamHierarchyView = asyncHandler(async (req, res, next) => {
    const { teamId } = req.params;

    // validate the teamId
    if (!teamId) {
        return next(new ApiError(400, 'teamId is required.'));
    }

    // fetch the team details including hierarchy
    const team = await prisma.teamManagement.findUnique({
        where: { id: teamId },
        select: {
            teamLeader: true,
            subteam: {
                select: {
                    id: true,
                    userName: true,
                }
            },
            members: {
                select: {
                    id: true,
                    userName: true,
                }
            },
            visualRepresentation: true,
            reportingLines: true
        }
    });

    if (!team) {
        return next(new ApiError(404, 'Team not found.'));
    }

    return res.status(200).json(new ApiResponse(200, team, "Team hierarchy retrieved successfully"));
});
