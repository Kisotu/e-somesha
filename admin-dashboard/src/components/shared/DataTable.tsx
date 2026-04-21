import React from "react";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  columns: {
    header: string;
    accessorKey: keyof T | string;
    cell?: (item: T) => React.ReactNode;
  }[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

function DataTable<T>({ 
  columns, 
  data, 
  isLoading, 
  emptyMessage = "No data found",
  onRowClick 
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="h-12 bg-slate-50 border-b border-slate-200 animate-pulse"></div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 border-b border-slate-100 last:border-0 animate-pulse bg-white"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 font-semibold tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? (
              data.map((item, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className={cn(
                    "bg-white transition-colors duration-200",
                    onRowClick ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50/50"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 text-slate-900 whitespace-nowrap">
                      {col.cell ? col.cell(item) : (item[col.accessorKey as keyof T] as unknown as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-slate-400 italic">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
