import mongoose, { Document, Types } from "mongoose";

export interface IAgentStatus extends Document {
  agentId: Types.ObjectId;
  customerId: string;
  name: string;
  status: string;
  totalDeposits: number;
  toDayDeposits: number;

  totalWithdrawals: number;
  toDayWithdrawals: number;

  totalCommissions: number;
  toDayCommissions: number;

  totalTakeCommissions: number;
  toDayTakeCommissions: number;

  totalPlayers: number;
  toDayPlayers: number;

  totalBets: number;
  toDayBets: number;

  totalProfit: number;
  toDayProfit: number;

  totalLoss: number;
  toDayLoss: number;

  createdAt: Date;
  updatedAt: Date;
}

const agentStatusSchema = new mongoose.Schema<IAgentStatus>(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, default: "active" },

    totalDeposits: { type: Number, default: 0 },
    toDayDeposits: { type: Number, default: 0 },

    totalWithdrawals: { type: Number, default: 0 },
    toDayWithdrawals: { type: Number, default: 0 },

    totalCommissions: { type: Number, default: 0 },
    toDayCommissions: { type: Number, default: 0 },

    totalTakeCommissions: { type: Number, default: 0 },
    toDayTakeCommissions: { type: Number, default: 0 },

    totalPlayers: { type: Number, default: 0 },
    toDayPlayers: { type: Number, default: 0 },

    totalBets: { type: Number, default: 0 },
    toDayBets: { type: Number, default: 0 },

    totalProfit: { type: Number, default: 0 },
    toDayProfit: { type: Number, default: 0 },

    totalLoss: { type: Number, default: 0 },
    toDayLoss: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const AgentStatus = mongoose.model<IAgentStatus>(
  "AgentStatus",
  agentStatusSchema
);

export default AgentStatus;
