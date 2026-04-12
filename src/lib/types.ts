import { TaskStatus, WarningLevel } from "@/lib/domain";

export type DashboardTask = {
  id: string;
  title: string;
  sourceLabel?: string | null;
  status: TaskStatus;
  workloadPoints: number;
  deadline: string;
  warningLevel: WarningLevel;
  isReallocated: boolean;
  assignee: { id: string; name: string } | null;
};

export type DashboardDocument = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
};

export type DashboardData = {
  /** 未带成员 Cookie 打开链接时为 true，仅浏览聚合数据 */
  isGuest?: boolean;
  /** 项目创建者，可编辑任务草稿并确认写入 */
  isOwner: boolean;
  project: {
    id: string;
    title: string;
    contextSummary: string;
    keyDeliverables?: string[] | null;
    deadline: string;
    inviteCode: string;
  };
  me: {
    id: string;
    name: string;
    accumulatedPoints: number;
    creditScore: number;
    email?: string | null;
  } | null;
  members: Array<{
    id: string;
    name: string;
    accumulatedPoints: number;
    creditScore: number;
  }>;
  tasks: DashboardTask[];
  logs: Array<{
    id: string;
    actionType: string;
    description: string;
    createdAt: string;
    user: { id: string; name: string };
  }>;
  documents: DashboardDocument[];
};
