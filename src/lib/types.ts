

export type User = {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  role: string; // Role is a string to allow for custom roles from the DB
  photoURL?: string;
  expertise?: string;
  baseSalary?: number;
  annualLeaveEntitlement?: number;
  disabled?: boolean;
};

export type Role = {
    id: string;
    name: string;
    permissions: string[];
};

export type Team = {
  id: string;
  name:string;
};

export type Task = {
  id: string;
  name: string;
  description?: string;
  docUrl?: string;
  doc?: File;
  status: 'To Do' | 'In Progress' | 'Done';
  assigneeId?: string;
  assigneeName?: string;
  certificateRequestId?: string;
};

export type Milestone = {
  id: string;
  name: string;
  description?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  startDate?: any; // Firestore Timestamp
  endDate?: any; // Firestore Timestamp
  tasks: Task[];
};

export type ProjectResource = {
  id: string;
  name: string;
  url: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  leadId?: string | null;
  leadName?: string | null;
  status: 'Not Started' | 'In Progress' | 'On Hold' | 'Completed';
  startDate?: any; // Firestore Timestamp
  endDate?: any; // Firestore Timestamp
  milestones?: Milestone[];
  resources?: ProjectResource[];
};

export type CertificateRequest = {
  id: string;
  taskTitle: string;
  associatedTeam: string;
  associatedProject: string;
  description: string;
  taskLink?: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  qaTesterId?: string;
  qaTesterName?: string;
  rejectionReason?: string;
  certificateId?: string;
  certificateStatus?: 'valid' | 'revoked';
  submissionRating?: number; // From QA to Requester
  qaProcessRating?: number; // From Requester to QA
  qaProcessFeedback?: string; // From Requester to QA
};

export type Certificate = {
    id: string;
    requestId: string;
    taskTitle: string;
    associatedTeam: string;
    associatedProject: string;
    requesterName: string;
    qaTesterName: string;
    approvalDate: any; // Firestore Timestamp
    status: 'valid' | 'revoked';
    revocationReason?: string;
    revocationDate?: any; // Firestore Timestamp
};

export type Comment = {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  userRole: User['role'];
  text: string;
  createdAt: any; // Firestore Timestamp
};

export type Infraction = {
  id: string;
  userId: string;
  userName: string;
  infractionType: string;
  description: string;
  deductionPercentage: number;
  dateIssued: any; // Firestore Timestamp
  issuedById: string;
  issuedByName: string;
};

export type Bonus = {
  id: string;
  userId: string;
  userName: string;
  bonusType: string;
  description: string;
  amount: number;
  currency: 'NGN' | 'PERCENTAGE';
  dateIssued: any; // Firestore Timestamp
  issuedById: string;
  issuedByName: string;
};

export type LeaveRequest = {
  id: string;
  userId: string;
  userName: string;
  leaveType: string;
  startDate: any; // Firestore Timestamp
  endDate: any; // Firestore Timestamp
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  requestedAt: any; // Firestore Timestamp
  reviewedAt?: any; // Firestore Timestamp
  reviewedById?: string; // Admin User ID
  reviewedByName?: string; // Admin name
  daysCount: number;
};


