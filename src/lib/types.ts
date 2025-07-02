export type User = {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  role: 'admin' | 'requester' | 'qa_tester';
  photoURL?: string;
  expertise?: string;
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
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
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
    approvalDate: any; // Firestore Timestamp
};
