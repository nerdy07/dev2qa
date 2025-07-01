export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'requester' | 'qa_tester';
};

export type Team = {
  id: string;
  name: string;
};

export type Project = {
  id: string;
  name: string;
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
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  qaTesterId?: string;
  qaTesterName?: string;
  rejectionReason?: string;
  certificateId?: string;
};

export type Certificate = {
    id: string;
    requestId: string;
    taskTitle: string;
    associatedTeam: string;
    associatedProject: string;
    requesterName: string;
    qaTesterName: string;
    approvalDate: Date;
};
