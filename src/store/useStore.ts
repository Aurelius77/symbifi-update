import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, Contractor, ProjectTeam, Payment } from '@/types';

interface Store {
  projects: Project[];
  contractors: Contractor[];
  projectTeams: ProjectTeam[];
  payments: Payment[];
  
  // Projects
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Contractors
  addContractor: (contractor: Contractor) => void;
  updateContractor: (id: string, contractor: Partial<Contractor>) => void;
  deleteContractor: (id: string) => void;
  
  // Project Teams
  addProjectTeam: (team: ProjectTeam) => void;
  updateProjectTeam: (id: string, team: Partial<ProjectTeam>) => void;
  deleteProjectTeam: (id: string) => void;
  
  // Payments
  addPayment: (payment: Payment) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  
  // Computed
  getCalculatedPay: (team: ProjectTeam) => number;
  getTotalPaidForTeam: (projectId: string, contractorId: string) => number;
  getBalanceDue: (projectId: string, contractorId: string) => number;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      projects: [],
      contractors: [],
      projectTeams: [],
      payments: [],
      
      // Projects
      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (id, project) => set((state) => ({
        projects: state.projects.map((p) => p.id === id ? { ...p, ...project } : p)
      })),
      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        projectTeams: state.projectTeams.filter((pt) => pt.projectId !== id),
        payments: state.payments.filter((pay) => pay.projectId !== id)
      })),
      
      // Contractors
      addContractor: (contractor) => set((state) => ({ contractors: [...state.contractors, contractor] })),
      updateContractor: (id, contractor) => set((state) => ({
        contractors: state.contractors.map((c) => c.id === id ? { ...c, ...contractor } : c)
      })),
      deleteContractor: (id) => set((state) => ({
        contractors: state.contractors.filter((c) => c.id !== id),
        projectTeams: state.projectTeams.filter((pt) => pt.contractorId !== id),
        payments: state.payments.filter((pay) => pay.contractorId !== id)
      })),
      
      // Project Teams
      addProjectTeam: (team) => set((state) => ({ projectTeams: [...state.projectTeams, team] })),
      updateProjectTeam: (id, team) => set((state) => ({
        projectTeams: state.projectTeams.map((t) => t.id === id ? { ...t, ...team } : t)
      })),
      deleteProjectTeam: (id) => set((state) => ({
        projectTeams: state.projectTeams.filter((t) => t.id !== id)
      })),
      
      // Payments
      addPayment: (payment) => set((state) => ({ payments: [...state.payments, payment] })),
      updatePayment: (id, payment) => set((state) => ({
        payments: state.payments.map((p) => p.id === id ? { ...p, ...payment } : p)
      })),
      deletePayment: (id) => set((state) => ({
        payments: state.payments.filter((p) => p.id !== id)
      })),
      
      // Computed
      getCalculatedPay: (team) => {
        const project = get().projects.find((p) => p.id === team.projectId);
        if (!project) return 0;
        
        if (team.paymentType === 'Fixed Amount') {
          return team.agreedAmount;
        } else {
          return (project.totalBudget * team.percentageShare) / 100;
        }
      },
      
      getTotalPaidForTeam: (projectId, contractorId) => {
        return get().payments
          .filter((p) => p.projectId === projectId && p.contractorId === contractorId)
          .reduce((sum, p) => sum + p.amountPaid, 0);
      },
      
      getBalanceDue: (projectId, contractorId) => {
        const team = get().projectTeams.find(
          (t) => t.projectId === projectId && t.contractorId === contractorId
        );
        if (!team) return 0;
        
        const calculatedPay = get().getCalculatedPay(team);
        const totalPaid = get().getTotalPaidForTeam(projectId, contractorId);
        return calculatedPay - totalPaid;
      },
    }),
    {
      name: 'symbifi-storage',
    }
  )
);
