
// src/components/PrintableItemReport.tsx
'use client'; 

import type { Item, HistoryEntry } from '@/lib/types';
import { format } from 'date-fns';
import { Package, ArrowUpCircle, ArrowDownCircle, Home } from 'lucide-react';
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
    {/* Outer house outline */}
    <path d="M3 21V10l9-6 9 6v11" />
    {/* Inner workflow icon (simplified representation of connected rounded squares) */}
    <g transform="translate(0 -1) scale(0.7) translate(4.25 4.25)">
      <rect x="7" y="10" width="4.5" height="4.5" rx="1" strokeWidth="1.5"/>
      <rect x="12.5" y="14.5" width="4.5" height="4.5" rx="1" strokeWidth="1.5"/>
      <path d="M9.25 14.5v-2a1 1 0 0 1 1-1h2.25" strokeWidth="1.5"/>
    </g>
  </svg>
);


// Helper to format history types
const translateHistoryType = (type: HistoryEntry['type']): string => {
  switch (type) {
    case 'CREATE_ITEM':
      return 'Item Created';
    case 'ADD_STOCK':
      return 'Stock Added';
    case 'CONSUME_STOCK':
      return 'Stock Consumed';
    case 'ADJUST_STOCK':
      return 'Stock Adjusted';
    default:
      return type.replace(/_/g, ' ');
  }
};


export function PrintableItemReport({ warehouseName, item, printedBy, printDate }: {
  warehouseName?: string;
  item: Item | null;
  printedBy: string;
  printDate: Date;
}) {
  if (!item) {
    return <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>Error: Item data is missing for the report.</div>;
  }

  const sortedHistory = [...(item.history || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let totalAdded = 0;
  let totalConsumed = 0;

  item.history?.forEach(entry => {
    if (entry.type === 'ADD_STOCK' || (entry.type === 'CREATE_ITEM' && entry.change > 0) || (entry.type === 'ADJUST_STOCK' && entry.change > 0)) {
      totalAdded += entry.change;
    } else if (entry.type === 'CONSUME_STOCK' || (entry.type === 'ADJUST_STOCK' && entry.change < 0)) {
      totalConsumed += Math.abs(entry.change);
    }
  });

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', direction: 'ltr', padding: '0', width: '100%', height: 'auto', margin: '0 auto' }} id="printable-content">
      <div className="print-header" style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <ReportLogo />
        <div>
          <h1 style={{ fontSize: '18pt', margin: '0 0 5px 0' }}>Item Transaction History</h1>
          <p style={{ fontSize: '12pt', margin: '0' }}>Warehouse: {warehouseName || "N/A"}</p>
        </div>
      </div>

      <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
        <p><strong>Item Name:</strong> {item.name || "N/A"}</p>
        <p><strong>Print Date:</strong> {format(printDate, "yyyy-MM-dd HH:mm:ss")}</p>
        <p><strong>Printed By:</strong> {printedBy || "System"}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #eee', borderRadius: '4px' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px', textAlign: 'center', backgroundColor: 'white' }}>
          <Package size={24} style={{ marginBottom: '5px', color: 'hsl(var(--primary))' }} />
          <div style={{ fontSize: '10pt', color: '#718096' }}>Current Quantity</div>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>{item.quantity}</div>
        </div>
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px', textAlign: 'center', backgroundColor: 'white' }}>
          <ArrowUpCircle size={24} style={{ marginBottom: '5px', color: '#38a169' }} />
          <div style={{ fontSize: '10pt', color: '#718096' }}>Total Added</div>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#38a169' }}>+{totalAdded}</div>
        </div>
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px', textAlign: 'center', backgroundColor: 'white' }}>
          <ArrowDownCircle size={24} style={{ marginBottom: '5px', color: '#e53e3e' }} />
          <div style={{ fontSize: '10pt', color: '#718096' }}>Total Consumed</div>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#e53e3e' }}>-{totalConsumed}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '14pt', marginTop: '20px', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
        Transaction History
      </h2>
      
      {sortedHistory.length > 0 ? (
        <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Date</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Type</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>Change</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>Qty Before</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>Qty After</th>
              <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', backgroundColor: '#f0f0f0', minWidth: '150px' }}>Comment</th>
            </tr>
          </thead>
          <tbody>
            {sortedHistory.map((entry) => (
              <tr key={entry.id}>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {format(new Date(entry.timestamp), "yyyy-MM-dd HH:mm:ss")}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {translateHistoryType(entry.type)}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', whiteSpace: 'nowrap', color: entry.change >= 0 ? 'green' : 'red' }}>
                  {entry.change > 0 ? `+${entry.change}` : entry.change}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>{entry.quantityBefore}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{entry.quantityAfter}</td>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', minWidth: '150px' }}>{entry.comment || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: '11pt', textAlign: 'center', marginTop: '20px' }}>No transaction history for this item.</p>
      )}
      
      <div className="print-footer" style={{ textAlign: 'center', marginTop: '30px', fontSize: '9pt', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        <p>This report was generated by the EZ Inventory Management System.</p>
      </div>
    </div>
  );
}
