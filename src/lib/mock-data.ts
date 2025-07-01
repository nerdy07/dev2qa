import type { User, Team, Project, CertificateRequest, Certificate } from './types';

export const mockUsers: User[] = [
  { id: 'usr_1', name: 'Alice Admin', email: 'admin@certitrack.com', role: 'admin' },
  { id: 'usr_2', name: 'Bob Developer', email: 'bob@certitrack.com', role: 'requester' },
  { id: 'usr_3', name: 'Charlie QA', email: 'charlie@certitrack.com', role: 'qa_tester' },
  { id: 'usr_4', name: 'Diana Designer', email: 'diana@certitrack.com', role: 'requester' },
  { id: 'usr_5', name: 'Eve QA', email: 'eve@certitrack.com', role: 'qa_tester' },
  { id: 'usr_6', name: 'Frank PM', email: 'frank@certitrack.com', role: 'requester' },
];

export const mockTeams: Team[] = [
  { id: 'team_1', name: 'Frontend Devs' },
  { id: 'team_2', name: 'Product Design' },
  { id: 'team_3', name: 'Infrastructure' },
  { id: 'team_4', name: 'Marketing' },
  { id: 'team_5', name: 'Backend Services' },
];

export const mockProjects: Project[] = [
  { id: 'proj_1', name: 'Website Redesign' },
  { id: 'proj_2', name: 'Mobile App V2' },
  { id: 'proj_3', name: 'API Integration' },
  { id: 'proj_4', name: 'Internal Tooling' },
  { id: 'proj_5', name: 'Q4 Marketing Campaign' },
];

export const mockRequests: CertificateRequest[] = [
  {
    id: 'req_1',
    taskTitle: 'Implement User Profile Page',
    associatedTeam: 'Frontend Devs',
    associatedProject: 'Website Redesign',
    description: 'Completed the new user profile page with updated UI components and API connections.',
    taskLink: 'http://jira.com/task/123',
    requesterId: 'usr_2',
    requesterName: 'Bob Developer',
    status: 'approved',
    createdAt: new Date('2024-05-20T10:00:00Z'),
    updatedAt: new Date('2024-05-22T14:00:00Z'),
    qaTesterId: 'usr_5',
    qaTesterName: 'Eve QA',
    certificateId: 'cert_2',
  },
  {
    id: 'req_2',
    taskTitle: 'Design New Onboarding Flow',
    associatedTeam: 'Product Design',
    associatedProject: 'Mobile App V2',
    description: 'Figma mockups and prototypes for the v2 onboarding experience are complete.',
    taskLink: 'http://figma.com/design/abc',
    requesterId: 'usr_4',
    requesterName: 'Diana Designer',
    status: 'approved',
    createdAt: new Date('2024-05-18T14:30:00Z'),
    updatedAt: new Date('2024-05-19T11:00:00Z'),
    qaTesterId: 'usr_3',
    qaTesterName: 'Charlie QA',
    certificateId: 'cert_1',
  },
  {
    id: 'req_3',
    taskTitle: 'Setup Staging K8s Cluster',
    associatedTeam: 'Infrastructure',
    associatedProject: 'Internal Tooling',
    description: 'The Kubernetes cluster for the staging environment is provisioned and configured.',
    requesterId: 'usr_2',
    requesterName: 'Bob Developer',
    status: 'rejected',
    createdAt: new Date('2024-05-15T09:00:00Z'),
    updatedAt: new Date('2024-05-16T16:45:00Z'),
    qaTesterId: 'usr_5',
    qaTesterName: 'Eve QA',
    rejectionReason: 'Monitoring and logging tools are not yet installed. Please complete setup before approval.',
  },
  {
    id: 'req_4',
    taskTitle: 'API Endpoint for User Settings',
    associatedTeam: 'Backend Services',
    associatedProject: 'API Integration',
    description: 'Created new GET and POST endpoints for managing user settings.',
    taskLink: 'http://github.com/pull/456',
    requesterId: 'usr_2',
    requesterName: 'Bob Developer',
    status: 'pending',
    createdAt: new Date('2024-05-21T11:00:00Z'),
    updatedAt: new Date('2024-05-21T11:00:00Z'),
  },
];

export const mockCertificates: Certificate[] = [
    {
        id: 'cert_1',
        requestId: 'req_2',
        taskTitle: 'Design New Onboarding Flow',
        associatedTeam: 'Product Design',
        associatedProject: 'Mobile App V2',
        requesterName: 'Diana Designer',
        qaTesterName: 'Charlie QA',
        approvalDate: new Date('2024-05-19T11:00:00Z'),
    },
    {
        id: 'cert_2',
        requestId: 'req_1',
        taskTitle: 'Implement User Profile Page',
        associatedTeam: 'Frontend Devs',
        associatedProject: 'Website Redesign',
        requesterName: 'Bob Developer',
        qaTesterName: 'Eve QA',
        approvalDate: new Date('2024-05-22T14:00:00Z'),
    },
];
