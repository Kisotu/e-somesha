import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios";
import type { DashboardStats } from "../types";

export const useStats = () => {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>("/api/admin/stats");
      return data;
    },
  });
};
