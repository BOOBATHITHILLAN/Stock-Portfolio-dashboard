"use client";

import { memo, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { StockData, SectorSummary } from "@/types/Stock";
import { groupBySector, formatCurrency } from "@/lib/utils";

const GainLossCell = ({ value }: { value: number }) => {
  const isGain = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isGain ? "text-emerald-600" : "text-red-600"}`}>
      {isGain ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {formatCurrency(value)}
    </span>
  );
};

const ExchangeBadge = ({ symbol }: { symbol: string }) => {
  const isNSE = symbol.includes(".NS") || symbol.includes(".NSE");
  const exchange = isNSE ? "NSE" : symbol.includes(".BO") || symbol.includes(".BSE") ? "BSE" : "---";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${isNSE ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
      {exchange}
    </span>
  );
};

const MobileStockCard = memo(({ stock }: { stock: StockData }) => {
  const isGain = stock.gainLoss >= 0;
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">{stock.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500">{stock.symbol}</span>
            <ExchangeBadge symbol={stock.symbol} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold tabular-nums">{formatCurrency(stock.cmp)}</div>
          <div className="text-[10px] text-slate-400 uppercase">CMP</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-slate-400 mb-0.5">Buy Price</div>
          <div className="font-medium tabular-nums">{formatCurrency(stock.buyPrice)}</div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">Qty</div>
          <div className="font-medium tabular-nums">{stock.qty}</div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">Wt%</div>
          <div className="font-medium tabular-nums">{stock.portfolioWeight}%</div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">Investment</div>
          <div className="font-medium tabular-nums">{formatCurrency(stock.investment)}</div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">Present Value</div>
          <div className="font-medium tabular-nums">{formatCurrency(stock.presentValue)}</div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">Gain/Loss</div>
          <div className={`font-semibold tabular-nums ${isGain ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(stock.gainLoss)}
          </div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">P/E</div>
          <div className="font-medium tabular-nums">{stock.peRatio}</div>
        </div>
        <div className="col-span-2">
          <div className="text-slate-400 mb-0.5">Latest Earnings</div>
          <div className="font-medium tabular-nums">{stock.latestEarnings}</div>
        </div>
      </div>
    </div>
  );
});

MobileStockCard.displayName = "MobileStockCard";

const MobileSectorGroup = ({ summary }: { summary: SectorSummary }) => {
  const isGain = summary.gainLoss >= 0;
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-xs font-bold text-blue-900 uppercase tracking-wide">{summary.sector}</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">
            Inv: <span className="font-semibold text-slate-700">{formatCurrency(summary.totalInvestment)}</span>
          </span>
          <span className={`font-bold ${isGain ? "text-emerald-600" : "text-red-600"}`}>
            {isGain ? "+" : ""}{formatCurrency(summary.gainLoss)}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {summary.stocks.map((stock) => (
          <MobileStockCard key={stock.symbol} stock={stock} />
        ))}
      </div>
    </div>
  );
};

const MobileView = ({ data }: { data: StockData[] }) => {
  const sectors = useMemo(() => groupBySector(data), [data]);
  return (
    <div className="space-y-2">
      {sectors.map((sector) => (
        <MobileSectorGroup key={sector.sector} summary={sector} />
      ))}
    </div>
  );
};

const SectorHeader = ({ summary }: { summary: SectorSummary }) => {
  const isGain = summary.gainLoss >= 0;
  return (
    <tr className="bg-blue-50 border-b-2 border-blue-200">
      <td colSpan={4} className="px-3 py-2 font-bold text-blue-900 text-xs uppercase tracking-wide">
        {summary.sector}
      </td>
      <td className="px-2 py-2 text-xs text-blue-700 font-semibold text-right">
        {formatCurrency(summary.totalInvestment)}
      </td>
      <td />
      <td />
      <td className="px-2 py-2 text-xs text-blue-700 font-semibold text-right">
        {formatCurrency(summary.totalPresentValue)}
      </td>
      <td className="px-2 py-2 text-right">
        <span className={`text-xs font-bold ${isGain ? "text-emerald-600" : "text-red-600"}`}>
          {formatCurrency(summary.gainLoss)}
        </span>
      </td>
      <td colSpan={2} />
    </tr>
  );
};

const columns: ColumnDef<StockData>[] = [
  {
    accessorKey: "name",
    header: "Particulars",
    size: 140,
    cell: ({ row }) => (
      <div className="min-w-[120px]">
        <div className="font-medium text-slate-900 text-xs leading-tight">{row.original.name}</div>
      </div>
    ),
  },
  {
    accessorKey: "buyPrice",
    header: "Price",
    size: 80,
    cell: ({ getValue }) => <div className="text-right text-xs tabular-nums">{formatCurrency(getValue<number>())}</div>,
  },
  {
    accessorKey: "qty",
    header: "Qty",
    size: 40,
    cell: ({ getValue }) => <div className="text-right text-xs tabular-nums">{getValue<number>()}</div>,
  },
  {
    accessorKey: "investment",
    header: "Investment",
    size: 90,
    cell: ({ getValue }) => <div className="text-right text-xs tabular-nums">{formatCurrency(getValue<number>())}</div>,
  },
  {
    accessorKey: "portfolioWeight",
    header: "Wt%",
    size: 50,
    cell: ({ getValue }) => <div className="text-right text-xs tabular-nums">{getValue<string>()}%</div>,
  },
  {
    accessorKey: "symbol",
    header: "Exch",
    size: 45,
    cell: ({ getValue }) => <ExchangeBadge symbol={getValue<string>()} />,
  },
  {
    accessorKey: "cmp",
    header: "CMP",
    size: 80,
    cell: ({ getValue }) => <div className="text-right text-xs font-semibold tabular-nums">{formatCurrency(getValue<number>())}</div>,
  },
  {
    accessorKey: "presentValue",
    header: "Present Val",
    size: 90,
    cell: ({ getValue }) => <div className="text-right text-xs tabular-nums">{formatCurrency(getValue<number>())}</div>,
  },
  {
    accessorKey: "gainLoss",
    header: "Gain/Loss",
    size: 100,
    cell: ({ getValue }) => (
      <div className="text-right">
        <GainLossCell value={getValue<number>()} />
      </div>
    ),
  },
  {
    accessorKey: "peRatio",
    header: "P/E",
    size: 50,
    cell: ({ getValue }) => <div className="text-right text-xs tabular-nums">{getValue<string>()}</div>,
  },
  {
    accessorKey: "latestEarnings",
    header: "Earnings",
    size: 80,
    cell: ({ getValue }) => <div className="text-right text-xs tabular-nums">{getValue<string>()}</div>,
  },
];

const DesktopTable = ({ data }: { data: StockData[] }) => {
  const sectors = useMemo(() => groupBySector(data), [data]);

  const totals = useMemo(() => {
    const totalInvestment = data.reduce((sum, s) => sum + s.investment, 0);
    const totalPresentValue = data.reduce((sum, s) => sum + s.presentValue, 0);
    return { totalInvestment, totalPresentValue, gainLoss: totalPresentValue - totalInvestment };
  }, [data]);

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full table-fixed text-xs">
        <thead>
          <tr className="bg-slate-800 text-white">
            {columns.map((col, i) => (
              <th
                key={i}
                style={{ width: col.size }}
                className={`px-2 py-2.5 font-semibold uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}
              >
                {typeof col.header === "function" ? flexRender(col.header, {} as never) : (col.header as string)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sectors.map((sector) => (
            <SectorGroup key={sector.sector} summary={sector} />
          ))}
          <tr className="bg-slate-800 text-white font-bold">
            <td colSpan={3} className="px-3 py-2.5 text-xs">GRAND TOTAL</td>
            <td className="px-2 py-2.5 text-right text-xs tabular-nums">{formatCurrency(totals.totalInvestment)}</td>
            <td />
            <td />
            <td />
            <td className="px-2 py-2.5 text-right text-xs tabular-nums">{formatCurrency(totals.totalPresentValue)}</td>
            <td className="px-2 py-2.5 text-right text-xs tabular-nums">
              <span className={totals.gainLoss >= 0 ? "text-emerald-400" : "text-red-400"}>
                {formatCurrency(totals.gainLoss)}
              </span>
            </td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const SectorGroup = ({ summary }: { summary: SectorSummary }) => {
  const table = useReactTable({
    data: summary.stocks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <SectorHeader summary={summary} />
      {table.getRowModel().rows.map((row, i) => (
        <tr
          key={row.id}
          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-25" : ""}`}
        >
          {row.getVisibleCells().map((cell) => (
            <td key={cell.id} className="px-2 py-2">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

type PortfolioTableProps = {
  data: StockData[];
};

const PortfolioTable = ({ data }: PortfolioTableProps) => (
  <>
    <div className="block lg:hidden">
      <MobileView data={data} />
    </div>
    <div className="hidden lg:block">
      <DesktopTable data={data} />
    </div>
  </>
);

export default PortfolioTable;
