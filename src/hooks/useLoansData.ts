import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '@/lib/apiClient';
import {
  AdmPositionReport,
  AdmProjectDetailsReport,
  InterProjectLoansReport,
  LoanReportFilters,
  LoanSettlementFilters,
  LoanSettlementReview,
  LoanSettlementReviewStatus,
  LoanSettlementsReport,
} from '@/types/database';

const emptyInterProject: InterProjectLoansReport = {
  total_circulating: 0,
  active_pairs_count: 0,
  oldest_loan_date: null,
  by_pair: [],
};

export const useAdmPosition = (filters?: LoanReportFilters) => {
  return useQuery({
    queryKey: ['adm-position', filters],
    queryFn: () => reportsApi.admPosition<AdmPositionReport>(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAdmProjectDetails = (projectId?: string, filters?: LoanReportFilters) => {
  return useQuery({
    queryKey: ['adm-project-details', projectId, filters],
    queryFn: () => reportsApi.admProjectDetails<AdmProjectDetailsReport>(projectId!, filters),
    enabled: Boolean(projectId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useInterProjectLoans = (filters?: LoanReportFilters) => {
  return useQuery({
    queryKey: ['inter-project-loans', filters],
    queryFn: () => reportsApi.interProjectLoans<InterProjectLoansReport>(filters),
    placeholderData: emptyInterProject,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useLoanSettlements = (filters?: LoanSettlementFilters) => {
  return useQuery({
    queryKey: ['loan-settlements', filters],
    queryFn: () => reportsApi.loanSettlements<LoanSettlementsReport>(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useReviewLoanSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      loanId,
      body,
    }: {
      loanId: string;
      body: { reviewStatus: LoanSettlementReviewStatus; reason: string; notes?: string };
    }) => reportsApi.reviewLoanSettlement<LoanSettlementReview>(loanId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-settlements'] });
    },
  });
};
