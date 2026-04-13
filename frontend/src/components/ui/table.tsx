import { forwardRef, type HTMLAttributes, type TableHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("[&_tr]:border-b", className)} {...props} />
);

export const TableBody = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);

export const TableRow = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b transition-colors hover:bg-slate-50", className)} {...props} />
);

export const TableHead = ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("h-12 px-4 text-left align-middle font-medium text-slate-500", className)} {...props} />
);

export const TableCell = ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("p-4 align-middle", className)} {...props} />
);

export const TableCaption = ({ className, ...props }: HTMLAttributes<HTMLTableCaptionElement>) => (
  <caption className={cn("mt-4 text-sm text-slate-500", className)} {...props} />
);
