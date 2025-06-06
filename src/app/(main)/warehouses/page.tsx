
'use client';

import * as React from 'react';
import Link from "next/link";
import ReactDOM from 'react-dom/client';
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Home, Trash2, Printer, Eye, Repeat, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Warehouse, Item, ArchivedReport } from '@/lib/types'; // Ensure Warehouse type is appropriate
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PrintableWarehouseReport } from '@/components/PrintableWarehouseReport';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const AppLogo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-48 w-48 text-primary", className)}
  >
    <path
        d="M3 21V10l9-6 9 6v11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
    />
    <g
        transform="translate(12 15.5) scale(0.5) translate(-12 -12)"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
    >
        <rect width="8" height="8" x="3" y="3" rx="2"/>
        <path d="M7 11v4a2 2 0 0 0 2 2h4"/>
        <rect width="8" height="8" x="13" y="13" rx="2"/>
    </g>
  </svg>
);

const AppLogoAndBrand = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AppLogo />
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl font-serif">
        <span className="text-accent">EZ</span> <span className="text-red-400">Inventory</span>
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">
        powered by{" "}
        <Link href="https://www.enjleez.tech/" target="_blank" rel="noopener noreferrer" className="font-medium text-red-400 hover:text-red-500 no-underline">
          ENJLEEZ TECH
        </Link>
      </p>
    </div>
  );
};

export default function WarehousesPage() {
  const [allActiveWarehouses, setAllActiveWarehouses] = React.useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showAll, setShowAll] = React.useState(false);
  const [selectedWarehouseForArchive, setSelectedWarehouseForArchive] = React.useState<Warehouse | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const { toast } = useToast();

  const loadWarehouses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "warehouses"), 
        where("isArchived", "==", false), 
        orderBy("updatedAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const warehousesFromFirestore = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          description: data.description,
          isArchived: data.isArchived,
          // Convert Firestore Timestamps to ISO strings for client-side use
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
          ownerId: "placeholder-owner-id",
        } as Warehouse;
      });
      setAllActiveWarehouses(warehousesFromFirestore);
    } catch (error) {
      console.error("Error loading warehouses from Firestore: ", error);
      toast({ title: "Error", description: "Failed to load warehouses.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const handleArchiveWarehouse = async () => {
    if (!selectedWarehouseForArchive) return;

    setIsLoading(true); // Consider a more specific loading state for this action
    try {
      const warehouseDocRef = doc(db, "warehouses", selectedWarehouseForArchive.id);
      await updateDoc(warehouseDocRef, {
        isArchived: true,
        updatedAt: serverTimestamp(),
      });

      // Archive items in the warehouse (Firestore batch write)
      const itemsQuery = query(collection(db, "items"), where("warehouseId", "==", selectedWarehouseForArchive.id));
      const itemsSnapshot = await getDocs(itemsQuery);
      const batch = writeBatch(db);
      itemsSnapshot.docs.forEach(itemDoc => {
        batch.update(itemDoc.ref, { isArchived: true, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      
      toast({ title: "Warehouse Archived", description: `${selectedWarehouseForArchive.name} and its items have been moved to the archive.` });
      setSelectedWarehouseForArchive(null);
      loadWarehouses(); // Reload warehouses to reflect changes
    } catch (error) {
      console.error("Error archiving warehouse: ", error);
      toast({ title: "Error", description: "Failed to archive warehouse.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintWarehouseReport = (warehouseToPrint: Warehouse) => {
    // This function will need to be updated to fetch items from Firestore
    // For now, let's keep the existing logic but acknowledge it needs update
    console.warn("handlePrintWarehouseReport needs to be updated to fetch items from Firestore");
    
    // Placeholder for items - in a real scenario, fetch from Firestore
    const warehouseItems: { name: string; quantity: number }[] = []; 

    const printableArea = document.createElement('div');
    printableArea.id = 'printable-report-area';
    document.body.appendChild(printableArea);

    const root = ReactDOM.createRoot(printableArea);
    root.render(
      <PrintableWarehouseReport
        warehouse={warehouseToPrint}
        items={warehouseItems} // This needs to be actual items
        printedBy="Admin User" 
        printDate={new Date()}
      />
    );

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        root.unmount();
        if (document.body.contains(printableArea)) {
          document.body.removeChild(printableArea);
        }
        // Archiving logic for reports remains (uses localStorage for now)
        const now = new Date();
        const archivedReport: ArchivedReport = {
          id: `${warehouseToPrint.id}-wh-report-${now.getTime()}`,
          reportType: 'WAREHOUSE',
          warehouseId: warehouseToPrint.id,
          warehouseName: warehouseToPrint.name,
          warehouseDescription: warehouseToPrint.description,
          printedBy: "Admin User",
          printedAt: now.toISOString(),
          itemsSnapshot: warehouseItems,
        };
        const existingReportsString = localStorage.getItem('archivedReports');
        const existingReports: ArchivedReport[] = existingReportsString ? JSON.parse(existingReportsString) : [];
        existingReports.push(archivedReport);
        localStorage.setItem('archivedReports', JSON.stringify(existingReports));
        toast({
          title: "Report Archived",
          description: `Report for warehouse ${warehouseToPrint.name} has been saved to localStorage.`,
        });
      }, 3000); 
    }, 250); 
  };

  const filteredWarehouses = allActiveWarehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedWarehouses = showAll ? filteredWarehouses : filteredWarehouses.slice(0, 4);

  if (isLoading && allActiveWarehouses.length === 0) {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><LoadingSpinner size={48} /></div>;
  }

  return (
    <TooltipProvider>
    <AlertDialog open={!!selectedWarehouseForArchive} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setSelectedWarehouseForArchive(null);
      }
    }}>
      <AppLogoAndBrand />
      <PageHeader
        title="Warehouses"
        description="Manage all your storage locations from here."
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search warehouses..."
                className="pl-8 h-10 w-full sm:w-[200px] md:w-[250px] lg:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/warehouses/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Warehouse
              </Link>
            </Button>
          </div>
        }
      />
      {displayedWarehouses.length === 0 ? (
        <EmptyState
          IconComponent={Home}
          title={searchTerm ? "No Warehouses Found" : "No Active Warehouses Yet"}
          description={searchTerm ? `Your search for "${searchTerm}" did not match any warehouses.` : "Get started by adding your first warehouse or check the archive."}
          action={!searchTerm ? {
            label: "Add Warehouse",
            href: "/warehouses/new",
            icon: PlusCircle,
          } : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {displayedWarehouses.map((warehouse) => (
              <Card key={warehouse.id} className="flex flex-col rounded-xl shadow-md hover:shadow-xl transition-transform duration-300 hover:-translate-y-1">
                <Link href={`/warehouses/${warehouse.id}`} className="flex flex-col flex-grow hover:bg-muted/50 transition-colors rounded-t-lg">
                  <CardHeader className="flex-grow p-5"> 
                    <div className="flex items-start justify-between">
                      <CardTitle className="font-bold text-lg mb-2.5 break-words">{warehouse.name}</CardTitle> 
                      <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    {warehouse.description && (
                      <CardDescription className="text-sm text-muted-foreground line-clamp-2 break-words mt-1">{warehouse.description}</CardDescription> 
                    )}
                  </CardHeader>
                </Link>
                <div className="flex items-center justify-end gap-1 p-3 pt-0 border-t mt-auto"> 
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => handlePrintWarehouseReport(warehouse)} aria-label={`Print report for ${warehouse.name}`}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Print Warehouse Report</p></TooltipContent>
                  </Tooltip>
                  <AlertDialogTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setSelectedWarehouseForArchive(warehouse)} aria-label={`Archive ${warehouse.name}`}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Archive Warehouse</p></TooltipContent>
                    </Tooltip>
                  </AlertDialogTrigger>
                </div>
              </Card>
            ))}
          </div>
          {filteredWarehouses.length > 4 && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setShowAll(prev => !prev)}>
                {showAll ? <Repeat className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {showAll ? "Show Recent (Top 4)" : "View All Warehouses"}
              </Button>
            </div>
          )}
        </>
      )}
      
      {selectedWarehouseForArchive && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Warehouse "{selectedWarehouseForArchive.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will move the warehouse and all its items to the archive. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedWarehouseForArchive(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveWarehouse} className="bg-destructive hover:bg-destructive/90">
              {isLoading ? <LoadingSpinner size={16} className="mr-2"/> : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
    </TooltipProvider>
  );
}
