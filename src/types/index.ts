export type ProjectStatus = 'Active' | 'Completed' | 'On Hold';
export type PaymentStructure = 'Single payment' | 'Milestones';
export type ContractorType = 'Individual' | 'Agency';
export type ContractorStatus = 'Active' | 'Inactive';
export type PaymentType = 'Fixed Amount' | 'Percentage';
export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';
export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'USSD' | 'Wallet' | 'Other';

export interface Project {
  id: string;
  name: string;
  clientName: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  paymentStructure: PaymentStructure;
  status: ProjectStatus;
  notes: string;
}

export interface Contractor {
  id: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  bankWalletDetails: string;
  contractorType: ContractorType;
  status: ContractorStatus;
}

export interface ProjectTeam {
  id: string;
  projectId: string;
  contractorId: string;
  responsibility: string;
  paymentType: PaymentType;
  agreedAmount: number;
  percentageShare: number;
  paymentStatus: PaymentStatus;
}

export interface Payment {
  id: string;
  projectId: string;
  contractorId: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string;
  recordedBy: string;
}

export interface PaymentSummary {
  projectId: string;
  contractorId: string;
  totalAgreedPay: number;
  totalPaid: number;
  balanceDue: number;
}
