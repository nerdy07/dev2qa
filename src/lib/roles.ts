
export const ROLES = {
    ADMIN: 'admin',
    QA_TESTER: 'qa_tester',
    REQUESTER: 'requester',
    DEVELOPER: 'developer',
    MANAGER: 'manager',
    HR_ADMIN: 'hr_admin',
    PROJECT_MANAGER: 'project_manager',
    SENIOR_QA: 'senior_qa',
} as const;

// Admin permission identifiers - any role with these permissions is considered an admin
export const ADMIN_PERMISSION_IDENTIFIERS = [
    'admin:read',
    'users:create',
    'users:delete',
    'roles:manage',
] as const;

export const ALL_PERMISSIONS = {
    // Admin Section
    ADMIN_SECTION: {
        READ: 'admin:read',
    },
    USERS: {
        CREATE: 'users:create',
        READ: 'users:read',
        UPDATE: 'users:update',
        DELETE: 'users:delete',
    },
    ROLES: {
        MANAGE: 'roles:manage',
    },
    TEAMS: {
        CREATE: 'teams:create',
        READ: 'teams:read',
        UPDATE: 'teams:update',
        DELETE: 'teams:delete',
    },
    PROJECTS: {
        CREATE: 'projects:create',
        READ: 'projects:read',
        UPDATE: 'projects:update',
        DELETE: 'projects:delete',
        ASSIGN_TASKS: 'projects:assign_tasks',
    },
    PROJECT_INSIGHTS: {
        READ: 'insights:read',
    },
    PROJECT_DIAGNOSTICS: {
        RUN: 'diagnostics:run',
    },
    PAYROLL: {
        READ: 'payroll:read',
    },
    LEAVE_MANAGEMENT: {
        MANAGE: 'leave:manage',
    },
    INFRACTIONS: {
        MANAGE: 'infractions:manage',
    },
    BONUSES: {
        MANAGE: 'bonuses:manage',
    },
    EXPENSES: {
        CREATE: 'expenses:create',
        READ: 'expenses:read',
        UPDATE: 'expenses:update',
        DELETE: 'expenses:delete',
    },
    
    // QA & Requester Section
    REQUESTS: {
        CREATE: 'requests:create',
        READ_ALL: 'requests:read_all',
        READ_OWN: 'requests:read_own',
        APPROVE: 'requests:approve',
        REJECT: 'requests:reject',
        ADD_COMMENT: 'requests:add_comment',
        RATE_SUBMISSION: 'requests:rate_submission',
        GIVE_FEEDBACK: 'requests:give_feedback',
    },
    CERTIFICATES: {
        READ: 'certificates:read',
        REVOKE: 'certificates:revoke',
    },
    LEADERBOARDS: {
        READ: 'leaderboards:read',
    },
    RECORDS: {
        READ_OWN: 'records:read_own',
    },
    LEAVE: {
        REQUEST: 'leave:request',
    },
    DESIGNS: {
        CREATE: 'designs:create',
        READ_OWN: 'designs:read_own',
        READ_ALL: 'designs:read_all',
        APPROVE: 'designs:approve',
    },
    REQUISITIONS: {
        CREATE: 'requisitions:create',
        READ_OWN: 'requisitions:read_own',
        READ_ALL: 'requisitions:read_all',
        APPROVE: 'requisitions:approve',
        REJECT: 'requisitions:reject',
        FULFILL: 'requisitions:fulfill',
        UPDATE: 'requisitions:update',
    },
    FILES: {
        CREATE: 'files:create',
        READ_ALL: 'files:read_all',
        READ_STAFF: 'files:read_staff', // Can read files visible to all staff
        UPDATE: 'files:update',
        DELETE: 'files:delete',
    },
} as const;

// Granular Admin Permission Groups
// These allow creating custom admin roles with specific permission sets
export const ADMIN_PERMISSION_GROUPS = {
    USER_MANAGEMENT: {
        label: 'User Management',
        description: 'Manage users, roles, and permissions',
        permissions: [
            ALL_PERMISSIONS.USERS.CREATE,
            ALL_PERMISSIONS.USERS.READ,
            ALL_PERMISSIONS.USERS.UPDATE,
            ALL_PERMISSIONS.USERS.DELETE,
            ALL_PERMISSIONS.ROLES.MANAGE,
        ],
    },
    TEAM_MANAGEMENT: {
        label: 'Team Management',
        description: 'Create, update, and delete teams',
        permissions: [
            ALL_PERMISSIONS.TEAMS.CREATE,
            ALL_PERMISSIONS.TEAMS.READ,
            ALL_PERMISSIONS.TEAMS.UPDATE,
            ALL_PERMISSIONS.TEAMS.DELETE,
        ],
    },
    PROJECT_MANAGEMENT: {
        label: 'Project Management',
        description: 'Manage projects, assign tasks, and view insights',
        permissions: [
            ALL_PERMISSIONS.PROJECTS.CREATE,
            ALL_PERMISSIONS.PROJECTS.READ,
            ALL_PERMISSIONS.PROJECTS.UPDATE,
            ALL_PERMISSIONS.PROJECTS.DELETE,
            ALL_PERMISSIONS.PROJECTS.ASSIGN_TASKS,
            ALL_PERMISSIONS.PROJECT_INSIGHTS.READ,
            ALL_PERMISSIONS.PROJECT_DIAGNOSTICS.RUN,
        ],
    },
    HR_MANAGEMENT: {
        label: 'HR Management',
        description: 'Manage leave, infractions, bonuses, and payroll',
        permissions: [
            ALL_PERMISSIONS.PAYROLL.READ,
            ALL_PERMISSIONS.LEAVE_MANAGEMENT.MANAGE,
            ALL_PERMISSIONS.INFRACTIONS.MANAGE,
            ALL_PERMISSIONS.BONUSES.MANAGE,
        ],
    },
    FINANCE_MANAGEMENT: {
        label: 'Finance Management',
        description: 'Manage expenses, income, and financial transactions',
        permissions: [
            ALL_PERMISSIONS.EXPENSES.CREATE,
            ALL_PERMISSIONS.EXPENSES.READ,
            ALL_PERMISSIONS.EXPENSES.UPDATE,
            ALL_PERMISSIONS.EXPENSES.DELETE,
        ],
    },
    REQUISITION_MANAGEMENT: {
        label: 'Requisition Management',
        description: 'Approve, reject, and fulfill requisitions',
        permissions: [
            ALL_PERMISSIONS.REQUISITIONS.READ_ALL,
            ALL_PERMISSIONS.REQUISITIONS.APPROVE,
            ALL_PERMISSIONS.REQUISITIONS.REJECT,
            ALL_PERMISSIONS.REQUISITIONS.FULFILL,
            ALL_PERMISSIONS.REQUISITIONS.UPDATE,
        ],
    },
    REQUEST_MANAGEMENT: {
        label: 'Request Management',
        description: 'View and manage certificate requests',
        permissions: [
            ALL_PERMISSIONS.REQUESTS.READ_ALL,
            ALL_PERMISSIONS.REQUESTS.ADD_COMMENT,
            ALL_PERMISSIONS.CERTIFICATES.READ,
            ALL_PERMISSIONS.CERTIFICATES.REVOKE,
        ],
    },
    DESIGN_MANAGEMENT: {
        label: 'Design Management',
        description: 'View and approve design requests',
        permissions: [
            ALL_PERMISSIONS.DESIGNS.READ_ALL,
            ALL_PERMISSIONS.DESIGNS.APPROVE,
        ],
    },
    ANALYTICS_ACCESS: {
        label: 'Analytics Access',
        description: 'View leaderboards and analytics',
        permissions: [
            ALL_PERMISSIONS.LEADERBOARDS.READ,
        ],
    },
    ADMIN_SECTION_ACCESS: {
        label: 'Admin Section Access',
        description: 'Access to admin dashboard and section',
        permissions: [
            ALL_PERMISSIONS.ADMIN_SECTION.READ,
        ],
    },
} as const;

// Helper function to get permissions from selected admin groups
export function getPermissionsFromAdminGroups(selectedGroups: string[]): string[] {
    const permissions: string[] = [];
    selectedGroups.forEach(groupKey => {
        const group = ADMIN_PERMISSION_GROUPS[groupKey as keyof typeof ADMIN_PERMISSION_GROUPS];
        if (group) {
            permissions.push(...group.permissions);
        }
    });
    return [...new Set(permissions)]; // Remove duplicates
}

/**
 * Check if a role has admin permissions by checking if any of its permissions
 * match the admin permission identifiers
 * @param rolePermissions - Array of permission strings for a role
 * @returns true if the role has any admin permissions
 */
export function hasAdminPermissions(rolePermissions: string[]): boolean {
    if (!rolePermissions || rolePermissions.length === 0) return false;
    return ADMIN_PERMISSION_IDENTIFIERS.some(adminPerm => 
        rolePermissions.includes(adminPerm)
    );
}

const ADMIN_PERMISSIONS = [
    ALL_PERMISSIONS.ADMIN_SECTION.READ,
    ALL_PERMISSIONS.USERS.CREATE,
    ALL_PERMISSIONS.USERS.READ,
    ALL_PERMISSIONS.USERS.UPDATE,
    ALL_PERMISSIONS.USERS.DELETE,
    ALL_PERMISSIONS.ROLES.MANAGE,
    ALL_PERMISSIONS.TEAMS.CREATE,
    ALL_PERMISSIONS.TEAMS.READ,
    ALL_PERMISSIONS.TEAMS.UPDATE,
    ALL_PERMISSIONS.TEAMS.DELETE,
    ALL_PERMISSIONS.PROJECTS.CREATE,
    ALL_PERMISSIONS.PROJECTS.READ,
    ALL_PERMISSIONS.PROJECTS.UPDATE,
    ALL_PERMISSIONS.PROJECTS.DELETE,
    ALL_PERMISSIONS.PROJECTS.ASSIGN_TASKS,
    ALL_PERMISSIONS.PROJECT_INSIGHTS.READ,
    ALL_PERMISSIONS.PROJECT_DIAGNOSTICS.RUN,
    ALL_PERMISSIONS.PAYROLL.READ,
    ALL_PERMISSIONS.LEAVE_MANAGEMENT.MANAGE,
    ALL_PERMISSIONS.INFRACTIONS.MANAGE,
    ALL_PERMISSIONS.BONUSES.MANAGE,
    ALL_PERMISSIONS.EXPENSES.CREATE,
    ALL_PERMISSIONS.EXPENSES.READ,
    ALL_PERMISSIONS.EXPENSES.UPDATE,
    ALL_PERMISSIONS.EXPENSES.DELETE,
    ALL_PERMISSIONS.REQUESTS.READ_ALL,
    ALL_PERMISSIONS.REQUESTS.ADD_COMMENT,
    ALL_PERMISSIONS.CERTIFICATES.READ,
    ALL_PERMISSIONS.CERTIFICATES.REVOKE,
    ALL_PERMISSIONS.LEADERBOARDS.READ,
    ALL_PERMISSIONS.DESIGNS.READ_ALL,
    ALL_PERMISSIONS.DESIGNS.APPROVE,
    ALL_PERMISSIONS.REQUISITIONS.CREATE,
    ALL_PERMISSIONS.REQUISITIONS.READ_ALL,
    ALL_PERMISSIONS.REQUISITIONS.APPROVE,
    ALL_PERMISSIONS.REQUISITIONS.REJECT,
    ALL_PERMISSIONS.REQUISITIONS.FULFILL,
    ALL_PERMISSIONS.REQUISITIONS.UPDATE,
    ALL_PERMISSIONS.FILES.CREATE,
    ALL_PERMISSIONS.FILES.READ_ALL,
    ALL_PERMISSIONS.FILES.UPDATE,
    ALL_PERMISSIONS.FILES.DELETE,
];

const QA_TESTER_PERMISSIONS = [
    ALL_PERMISSIONS.REQUESTS.READ_ALL,
    ALL_PERMISSIONS.REQUESTS.APPROVE,
    ALL_PERMISSIONS.REQUESTS.REJECT,
    ALL_PERMISSIONS.REQUESTS.ADD_COMMENT,
    ALL_PERMISSIONS.REQUESTS.RATE_SUBMISSION,
    ALL_PERMISSIONS.CERTIFICATES.READ,
    ALL_PERMISSIONS.CERTIFICATES.REVOKE,
    ALL_PERMISSIONS.LEADERBOARDS.READ,
    ALL_PERMISSIONS.RECORDS.READ_OWN,
    ALL_PERMISSIONS.LEAVE.REQUEST,
    ALL_PERMISSIONS.DESIGNS.READ_ALL, // Can view designs
    ALL_PERMISSIONS.REQUISITIONS.CREATE,
    ALL_PERMISSIONS.REQUISITIONS.READ_OWN,
    ALL_PERMISSIONS.FILES.READ_STAFF, // QA testers can view staff-visible files
];

const REQUESTER_PERMISSIONS = [
    ALL_PERMISSIONS.REQUESTS.CREATE,
    ALL_PERMISSIONS.REQUESTS.READ_OWN,
    ALL_PERMISSIONS.REQUESTS.ADD_COMMENT,
    ALL_PERMISSIONS.REQUESTS.GIVE_FEEDBACK,
    ALL_PERMISSIONS.LEADERBOARDS.READ,
    ALL_PERMISSIONS.CERTIFICATES.READ,
    ALL_PERMISSIONS.RECORDS.READ_OWN,
    ALL_PERMISSIONS.LEAVE.REQUEST,
    ALL_PERMISSIONS.DESIGNS.CREATE,
    ALL_PERMISSIONS.DESIGNS.READ_OWN,
    ALL_PERMISSIONS.REQUISITIONS.CREATE,
    ALL_PERMISSIONS.REQUISITIONS.READ_OWN,
    ALL_PERMISSIONS.FILES.READ_STAFF, // Requesters can view staff-visible files
];

const DEVELOPER_PERMISSIONS = [
    ALL_PERMISSIONS.PROJECTS.READ, // Developers can only view projects, not edit or delete
    ALL_PERMISSIONS.REQUESTS.CREATE,
    ALL_PERMISSIONS.REQUESTS.READ_OWN,
    ALL_PERMISSIONS.REQUESTS.ADD_COMMENT,
    ALL_PERMISSIONS.LEADERBOARDS.READ,
    ALL_PERMISSIONS.CERTIFICATES.READ,
    ALL_PERMISSIONS.RECORDS.READ_OWN,
    ALL_PERMISSIONS.LEAVE.REQUEST,
    ALL_PERMISSIONS.DESIGNS.CREATE,
    ALL_PERMISSIONS.DESIGNS.READ_OWN,
    ALL_PERMISSIONS.REQUISITIONS.CREATE,
    ALL_PERMISSIONS.REQUISITIONS.READ_OWN,
    ALL_PERMISSIONS.FILES.READ_STAFF, // Developers can view staff-visible files
];

const MANAGER_PERMISSIONS = [
    ALL_PERMISSIONS.TEAMS.READ,
    ALL_PERMISSIONS.PROJECTS.READ,
    ALL_PERMISSIONS.REQUESTS.READ_ALL,
    ALL_PERMISSIONS.REQUESTS.ADD_COMMENT,
    ALL_PERMISSIONS.LEADERBOARDS.READ,
    ALL_PERMISSIONS.CERTIFICATES.READ,
    ALL_PERMISSIONS.RECORDS.READ_OWN,
    ALL_PERMISSIONS.LEAVE.REQUEST,
    ALL_PERMISSIONS.DESIGNS.READ_ALL,
    ALL_PERMISSIONS.REQUISITIONS.CREATE,
    ALL_PERMISSIONS.REQUISITIONS.READ_OWN,
    ALL_PERMISSIONS.FILES.READ_STAFF, // Managers can view staff-visible files
];

const HR_ADMIN_PERMISSIONS = [
    ALL_PERMISSIONS.USERS.READ,
    ALL_PERMISSIONS.USERS.UPDATE,
    ALL_PERMISSIONS.PAYROLL.READ,
    ALL_PERMISSIONS.LEAVE_MANAGEMENT.MANAGE,
    ALL_PERMISSIONS.INFRACTIONS.MANAGE,
    ALL_PERMISSIONS.BONUSES.MANAGE,
    ALL_PERMISSIONS.REQUESTS.READ_ALL,
    ALL_PERMISSIONS.LEADERBOARDS.READ,
    ALL_PERMISSIONS.CERTIFICATES.READ,
    ALL_PERMISSIONS.RECORDS.READ_OWN,
    ALL_PERMISSIONS.LEAVE.REQUEST,
    ALL_PERMISSIONS.REQUISITIONS.CREATE,
    ALL_PERMISSIONS.REQUISITIONS.READ_OWN,
    ALL_PERMISSIONS.REQUISITIONS.READ_ALL,
    ALL_PERMISSIONS.REQUISITIONS.APPROVE,
    ALL_PERMISSIONS.REQUISITIONS.REJECT,
    ALL_PERMISSIONS.REQUISITIONS.FULFILL,
    ALL_PERMISSIONS.REQUISITIONS.UPDATE,
    ALL_PERMISSIONS.FILES.CREATE,
    ALL_PERMISSIONS.FILES.READ_ALL,
    ALL_PERMISSIONS.FILES.UPDATE,
    ALL_PERMISSIONS.FILES.DELETE,
];

const PROJECT_MANAGER_PERMISSIONS = [
    ALL_PERMISSIONS.PROJECTS.CREATE,
    ALL_PERMISSIONS.PROJECTS.READ,
    ALL_PERMISSIONS.PROJECTS.UPDATE,
    ALL_PERMISSIONS.PROJECTS.DELETE, // Project managers can delete projects
    ALL_PERMISSIONS.PROJECTS.ASSIGN_TASKS,
    ALL_PERMISSIONS.PROJECT_INSIGHTS.READ,
    ALL_PERMISSIONS.REQUESTS.READ_ALL,
    ALL_PERMISSIONS.REQUESTS.ADD_COMMENT,
    ALL_PERMISSIONS.LEADERBOARDS.READ,
    ALL_PERMISSIONS.CERTIFICATES.READ,
    ALL_PERMISSIONS.RECORDS.READ_OWN,
    ALL_PERMISSIONS.LEAVE.REQUEST,
    ALL_PERMISSIONS.DESIGNS.READ_ALL,
    ALL_PERMISSIONS.DESIGNS.APPROVE, // Project managers can approve designs
    ALL_PERMISSIONS.REQUISITIONS.CREATE,
    ALL_PERMISSIONS.REQUISITIONS.READ_OWN,
    ALL_PERMISSIONS.FILES.CREATE,
    ALL_PERMISSIONS.FILES.READ_ALL,
    ALL_PERMISSIONS.FILES.UPDATE,
];

const SENIOR_QA_PERMISSIONS = [
    ALL_PERMISSIONS.REQUESTS.READ_ALL,
    ALL_PERMISSIONS.REQUESTS.APPROVE,
    ALL_PERMISSIONS.REQUESTS.REJECT,
    ALL_PERMISSIONS.REQUESTS.ADD_COMMENT,
    ALL_PERMISSIONS.REQUESTS.RATE_SUBMISSION,
    ALL_PERMISSIONS.CERTIFICATES.READ,
    ALL_PERMISSIONS.CERTIFICATES.REVOKE,
    ALL_PERMISSIONS.LEADERBOARDS.READ,
    ALL_PERMISSIONS.RECORDS.READ_OWN,
    ALL_PERMISSIONS.LEAVE.REQUEST,
    ALL_PERMISSIONS.DESIGNS.READ_ALL,
    ALL_PERMISSIONS.DESIGNS.APPROVE,
    ALL_PERMISSIONS.REQUISITIONS.CREATE,
    ALL_PERMISSIONS.REQUISITIONS.READ_OWN,
    ALL_PERMISSIONS.FILES.READ_STAFF, // Senior QA can view staff-visible files
];

export const PERMISSIONS_BY_ROLE = {
    [ROLES.ADMIN]: ADMIN_PERMISSIONS,
    [ROLES.QA_TESTER]: QA_TESTER_PERMISSIONS,
    [ROLES.REQUESTER]: REQUESTER_PERMISSIONS,
    [ROLES.DEVELOPER]: DEVELOPER_PERMISSIONS,
    [ROLES.MANAGER]: MANAGER_PERMISSIONS,
    [ROLES.HR_ADMIN]: HR_ADMIN_PERMISSIONS,
    [ROLES.PROJECT_MANAGER]: PROJECT_MANAGER_PERMISSIONS,
    [ROLES.SENIOR_QA]: SENIOR_QA_PERMISSIONS,
};
