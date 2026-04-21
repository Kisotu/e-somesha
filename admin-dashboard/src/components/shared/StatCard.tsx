import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, className }) => {
  return (
    <div className={cn("p-6 bg-white rounded-xl border border-slate-200 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        {description && (
          <span className="text-xs text-slate-500 mt-1">{description}</span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
