import AgentStatus from "@/models/AgentStatus.model";
import { User } from "@/models/user.model";
import { ApiError } from "@/utils/ApiError";
import { catchAsync } from "@/utils/catchAsync";
import { NextFunction, Request, Response } from "express";

/* ────────── Get All Agents ────────── */
export const getAllAgents = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const agents = await User.find({ role: "agent" }).select(
      "-password -resetPasswordToken -resetPasswordExpire"
    );

    if (!agents || agents.length === 0) {
      return next(new ApiError(404, "No agents found"));
    }

    res.status(200).json({
      success: true,
      data: agents,
    });
  }
);

/* ────────── Create AgentStatus for all agent ────────── */
export const createAgentStatusForAllAgents = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const agents = await User.find({ role: "agent" });

    if (!agents || agents.length === 0) {
      return next(new ApiError(404, "No agents found"));
    }

    const createdStatuses = [];

    for (const agent of agents) {
      const existingStatus = await AgentStatus.findOne({ agentId: agent._id });

      if (!existingStatus) {
        const newStatus = new AgentStatus({
          agentId: agent._id,
          customerId: agent.customerId,
          name: agent.name,
        });
        await newStatus.save();
        createdStatuses.push(newStatus);
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdStatuses.length} AgentStatus records created.`,
      data: createdStatuses,
    });
  }
);
