
// src/components/PrintableTransactionsReport.tsx
'use client';

import type { HistoryEntry } from '@/lib/types'; 
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Define the logo component to be used in reports
const ReportLogo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5" 
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-10 w-10 text-primary", className)} 
  >
    <path d="M3 21V10l9-6 9 6v11" /> {/* Outer house outline */}
    <g transform="translate(0 -1) scale(0.7) translate(4.25 4.25)"> {/* Scaled down and repositioned */}
      <rect x="7" y="10" width="4.5" height="4.5" rx="1" strokeWidth="1.5"/>
      <rect x="12.5" y="14.5" width="4.5" height="4.5" rx="1" strokeWidth="1.5"/>
      <path d="M9.25 14.5v-2a1 1 0 0 1 1-1h2.25" strokeWidth="1.5"/>
    </g>
  </svg>
);

interface FlattenedHistoryEntry extends HistoryEntry {
  itemName: string;
  warehouseName: string;
  itemId: string;
  warehouseId: string;
}

interface PrintableTransactionsReportProps {
  transactions: FlattenedHistoryEntry[];
  reportTitle: string;
  printedBy: string;
  printDate: Date;
}

const formatHistoryType = (type: HistoryEntry['type']): string => {
  switch (type) {
    case 'CREATE_ITEM': return 'Item Created';
    case 'ADD_STOCK': return 'Stock Added';
    case 'CONSUME_STOCK': return 'Stock Consumed';
    case 'ADJUST_STOCK': return 'Stock Adjusted';
    default: return type.replace(/_/g, ' ');
  }
};

export function PrintableTransactionsReport({ transactions, reportTitle, printedBy, printDate }: PrintableTransactionsReportProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', direction: 'ltr', padding: '0', width: '100%', height: 'auto', margin: '0 auto' }} id="printable-content">
      {/* Styles are primarily handled by print.css and @page rules */}
      
      <div className="print-header" style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <ReportLogo />
        <div>
          <h1 style={{ fontSize: '16pt', margin: '0 0 5px 0' }}>{reportTitle}</h1>
          <p style={{ fontSize: '11pt', margin: '0' }}>EZ Inventory - Transaction Report</p>
        </div>
      </div>

      <div style={{ marginBottom: '15px', fontSize: '10pt' }}>
        <p><strong>Print Date:</strong> {format(printDate, "yyyy-MM-dd HH:mm:ss")}</p>
        <p><strong>Printed By:</strong> {printedBy}</p>
      </div>

      <h2 style={{ fontSize: '13pt', marginTop: '20px', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
        Transactions
      </h2>
      
      {transactions.length > 0 ? (
        <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Item Name</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Warehouse</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Type</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>Change</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>Before</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>After</th>
              <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', backgroundColor: '#f0f0f0', minWidth: '120px' }}>Comment</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((entry) => (
              <tr key={entry.id + entry.timestamp}> {/* Ensure unique key if IDs are not globally unique */}
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {format(new Date(entry.timestamp), "yyyy-MM-dd HH:mm")}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>{entry.itemName}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>{entry.warehouseName}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {formatHistoryType(entry.type)}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', whiteSpace: 'nowrap', color: entry.change >= 0 ? 'green' : 'red' }}>
                  {entry.change > 0 ? `+${entry.change}` : entry.change}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', whiteSpace: 'nowrap' }}>{entry.quantityBefore}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{entry.quantityAfter}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left', minWidth: '120px', wordBreak: 'break-word' }}>{entry.comment || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: '11pt', textAlign: 'center', marginTop: '20px' }}>No transactions found for this selection.</p>
      )}
      
      <div className="print-footer" style={{ textAlign: 'center', marginTop: '30px', fontSize: '9pt', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <p>This report was generated by the EZ Inventory Management System.</p>
      </div>
    </div>
  );
}
