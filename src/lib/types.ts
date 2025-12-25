
export type EmployeeDocument = {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: any; // Firestore Timestamp
};

export type User = {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  permissions: string[]; // Direct permissions array - no role layer
  isAdmin?: boolean; // Computed field: true if user has admin permissions
  isProjectManager?: boolean; // Computed field: true if user has project manager permissions
  photoURL?: string;
  expertise?: string;
  baseSalary?: number;
  annualLeaveEntitlement?: number;
  disabled?: boolean;
  teamId?: string; // Reference to team
  startDate?: any; // Firestore Timestamp
  documents?: EmployeeDocument[]; // Employee documents
  // Legacy fields for backward compatibility (deprecated)
  role?: string; // Deprecated: use permissions instead
  roles?: string[]; // Deprecated: use permissions instead
};

export type Role = {
    id: string;
    name: string;
    permissions: string[];
};

export type Team = {
  id: string;
  name: string;
  description?: string;
  department?: string;
  teamLeadId?: string;
  status?: 'active' | 'inactive' | 'archived';
  createdAt?: string;
  updatedAt?: string;
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
  testLinks?: string[]; // Links added when marking task as Done
  startDate?: any; // Firestore Timestamp
  endDate?: any; // Firestore Timestamp
  certificateRequired?: boolean;
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
  certificateStatus?: 'valid' | 'revoked' | 'not_required';
  certificateRequired?: boolean;
  submissionRating?: number; // From QA to Requester
  qaProcessRating?: number; // From Requester to QA
  qaProcessFeedback?: string; // From Requester to QA
  firstReminderSentAt?: any; // Firestore Timestamp
  reminderCount?: number;
};

export type DesignRequest = {
  id: string;
  designTitle: string;
  figmaUrl: string;
  description: string;
  designerId: string;
  designerName: string;
  designerEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  reviewerId?: string;
  reviewerName?: string;
  reviewComments?: string;
};

export type Certificate = {
    id: string;
    requestId: string;
    requestShortId?: string;
    shortId?: string;
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

export type InfractionType = {
  id: string;
  name: string;
  deduction: number;
  createdAt?: any;
  updatedAt?: any;
};

export type BonusType = {
  id: string;
  name: string;
  amount: number;
  currency: 'NGN' | 'PERCENTAGE';
  createdAt?: any;
  updatedAt?: any;
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

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  currency: 'NGN' | 'USD' | 'EUR' | string;
  date: any; // Firestore Timestamp
  createdById?: string;
  createdByName?: string;
  receiptUrl?: string;
  notes?: string;
  projectId?: string;
  projectName?: string;
};

export type RequisitionItem = {
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  estimatedTotal?: number;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  supplier?: string;
  specifications?: string;
};

export type Requisition = {
  id: string;
  shortId?: string;
  title: string;
  description?: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterDepartment?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'partially_fulfilled' | 'cancelled';
  items?: RequisitionItem[];
  totalEstimatedAmount?: number;
  currency?: 'NGN' | 'USD' | 'EUR';
  urgency?: 'low' | 'medium' | 'high' | 'urgent';
  priority?: 'normal' | 'urgent' | 'critical';
  justification?: string;
  requiredByDate?: any; // Firestore Timestamp
  requestedAt?: any; // Firestore Timestamp (for backward compatibility)
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  submittedAt?: any; // Firestore Timestamp
  reviewedAt?: any; // Firestore Timestamp
  reviewedById?: string;
  reviewedByName?: string;
  rejectionReason?: string;
  fulfilledAt?: any; // Firestore Timestamp
  fulfilledById?: string;
  fulfilledByName?: string;
  fulfillmentNotes?: string;
  accountNumber?: string; // Bank account number for money requisitions
  bankName?: string; // Bank name for money requisitions
};

export type Notification = {
  id: string;
  userId: string;
  type: 'leaderboard_top_user' | 'leaderboard_new_top' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: any; // Firestore Timestamp
  data?: {
    topUserId?: string;
    leaderboardType?: 'qa' | 'requester';
    previousTopUserId?: string;
  };
};

export type Achievement = {
  id: string;
  userId: string;
  type: 'top_qa_tester' | 'top_requester' | 'first_approval' | 'milestone_10' | 'milestone_50' | 'milestone_100';
  title: string;
  description: string;
  icon?: string;
  earnedAt: any; // Firestore Timestamp
  badgeUrl?: string;
};

export type CompanyFile = {
  id: string;
  name: string;
  description?: string;
  type: 'upload' | 'link'; // 'upload' for direct file uploads, 'link' for external URLs
  fileUrl?: string; // URL for uploaded files or external links
  fileSize?: number; // Size in bytes (for uploads)
  mimeType?: string; // MIME type (for uploads)
  folderType: 'project' | 'general'; // 'project' = file belongs to a project, 'general' = company-wide file (policies, etc.)
  projectId?: string; // Project ID if folderType is 'project'
  projectName?: string; // Project name (denormalized for easier display)
  category?: string; // Optional category/folder for general files (e.g., "Company Policies", "HR Documents", "Legal")
  visibility: 'all_staff' | 'restricted'; // Who can view this file: 'all_staff' = anyone with files:read_staff, 'restricted' = requires files:read_all permission
  uploadedBy: string; // User ID
  uploadedByName: string; // User name
  uploadedByEmail: string; // User email
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  tags?: string[]; // Optional tags for search/filtering
  downloadCount?: number; // Track downloads (for uploads)
  resourceId?: string; // Optional link back to project resource entry
};

export type Client = {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  phone?: string;
  taxId?: string; // Tax ID or VAT number
  defaultCurrency: string; // ISO currency code (e.g., 'USD', 'NGN', 'EUR')
  contactPerson?: string;
  notes?: string;
  status: 'active' | 'archived';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // Percentage (e.g., 10 for 10%)
  discount?: number; // Amount or percentage
  total: number; // Calculated: (quantity * unitPrice) - discount + tax
};

export type InvoicePayment = {
  id: string;
  paymentDate: any; // Firestore Timestamp
  amount: number;
  referenceNumber?: string;
  notes?: string;
};

export type BankAccount = {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
  isDefault?: boolean;
  notes?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
};

export type CompanySettings = {
  id: string; // Always 'company' (singleton)
  companyName: string;
  email: string;
  phone?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  taxId?: string; // Tax ID or VAT number
  logoUrl?: string;
  defaultCurrency: string;
  paymentTerms?: string; // Default payment terms
  invoiceNotes?: string; // Default notes for invoices
  bankAccounts?: BankAccount[];
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
};

export type Invoice = {
  id: string;
  invoiceNumber: string; // Auto-generated: INV-YYYY-###
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  
  // Client information
  clientId: string;
  clientName: string; // Denormalized for easier display
  
  // Project information (optional)
  projectId?: string;
  projectName?: string; // Denormalized for easier display
  
  // Payment account
  bankAccountId?: string;
  bankAccountName?: string; // Denormalized
  bankAccountNumber?: string; // Denormalized
  bankName?: string; // Denormalized
  
  // Financial information
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string; // ISO currency code
  exchangeRate?: number; // If different from base currency
  
  // Dates
  issueDate: any; // Firestore Timestamp
  dueDate: any; // Firestore Timestamp
  sentAt?: any; // Firestore Timestamp
  paidAt?: any; // Firestore Timestamp
  
  // Recurring invoice information
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually' | 'custom';
  recurringInterval?: number; // For custom frequency
  nextInvoiceDate?: any; // Firestore Timestamp
  parentInvoiceId?: string; // For recurring series - links to parent invoice
  
  // Payment tracking
  payments?: InvoicePayment[];
  paidAmount: number;
  outstandingAmount: number;
  
  // Metadata
  createdById: string;
  createdByName: string;
  notes?: string;
  terms?: string; // Payment terms
  pdfUrl?: string; // URL to generated PDF
  lastReminderSentAt?: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
};
