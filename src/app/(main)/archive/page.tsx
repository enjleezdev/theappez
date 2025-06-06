
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Warehouse as WarehouseIcon, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Warehouse, Item } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

const updateWarehouseTimestampInFirestore = async (warehouseId: string) => {
  try {
    const warehouseDocRef = doc(db, "warehouses", warehouseId);
    await updateDoc(warehouseDocRef, {
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to update warehouse timestamp in Firestore", error);
    // Optionally, show a toast for this error if it's critical for user feedback
  }
};


export default function ArchivePage() {
  const { toast } = useToast();
  const [archivedWarehouses, setArchivedWarehouses] = React.useState<Warehouse[]>([]);
  const [allWarehousesMap, setAllWarehousesMap] = React.useState<Map<string, string>>(new Map());
  const [archivedItems, setArchivedItems] = React.useState<Item[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadArchivedData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all warehouses to get names for items
      const allWhQuery = query(collection(db, "warehouses"));
      const allWhSnapshot = await getDocs(allWhQuery);
      const whMap = new Map<string, string>();
      allWhSnapshot.forEach(docSnap => {
        whMap.set(docSnap.id, docSnap.data().name);
      });
      setAllWarehousesMap(whMap);

      // Load archived warehouses
      const archivedWhQuery = query(
        collection(db, "warehouses"),
        where("isArchived", "==", true),
        orderBy("updatedAt", "desc")
      );
      const archivedWhSnapshot = await getDocs(archivedWhQuery);
      const whsFromFirestore = archivedWhSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          description: data.description,
          isArchived: data.isArchived,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as Warehouse;
      });
      setArchivedWarehouses(whsFromFirestore);

      // Load archived items
      const archivedItemsQuery = query(
        collection(db, "items"),
        where("isArchived", "==", true),
        orderBy("updatedAt", "desc")
      );
      const archivedItemsSnapshot = await getDocs(archivedItemsQuery);
      const itemsFromFirestore = archivedItemsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          warehouseId: data.warehouseId,
          name: data.name,
          quantity: data.quantity,
          location: data.location,
          history: data.history || [],
          isArchived: data.isArchived,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as Item;
      });
      setArchivedItems(itemsFromFirestore);

    } catch (error) {
      console.error("Failed to load archived data from Firestore", error);
      toast({ title: "Error", description: "Failed to load archived data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadArchivedData();
  }, [loadArchivedData]);

  const getWarehouseName = (warehouseId: string): string => {
    return allWarehousesMap.get(warehouseId) || "Unknown Warehouse";
  };

  const handleRestoreWarehouse = async (warehouseId: string) => {
    setIsLoading(true); // Or a specific loading state for this action
    try {
      const warehouseDocRef = doc(db, "warehouses", warehouseId);
      const warehouseSnap = await getDoc(warehouseDocRef);
      const warehouseName = warehouseSnap.exists() ? warehouseSnap.data().name : "The warehouse";

      await updateDoc(warehouseDocRef, {
        isArchived: false,
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Warehouse Restored", description: `${warehouseName} has been restored.` });
      loadArchivedData(); // Reload data to reflect changes
    } catch (error) {
      console.error("Failed to restore warehouse from Firestore", error);
      toast({ title: "Error", description: "Failed to restore warehouse.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreItem = async (itemId: string) => {
     setIsLoading(true); // Or a specific loading state for this action
    try {
      const itemDocRef = doc(db, "items", itemId);
      const itemSnap = await getDoc(itemDocRef);
      let restoredItemName = "The item";
      let parentWarehouseId = "";

      if (itemSnap.exists()) {
        restoredItemName = itemSnap.data().name;
        parentWarehouseId = itemSnap.data().warehouseId;
      }
      
      await updateDoc(itemDocRef, {
        isArchived: false,
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Item Restored", description: `${restoredItemName} has been restored.` });
      
      if (parentWarehouseId) {
        await updateWarehouseTimestampInFirestore(parentWarehouseId);
      }
      loadArchivedData(); // Reload data to reflect changes
    } catch (error) {
      console.error("Failed to restore item from Firestore", error);
      toast({ title: "Error", description: "Failed to restore item.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading && archivedWarehouses.length === 0 && archivedItems.length === 0) {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><LoadingSpinner size={48} /></div>;
  }

  return (
    <>
      <PageHeader
        title="Archive"
        description="View and manage archived warehouses and items."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Archived Warehouses</CardTitle>
            <CardDescription>Warehouses that have been moved to the archive.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && archivedWarehouses.length === 0 ? <LoadingSpinner className="mx-auto my-4" /> :
            archivedWarehouses.length === 0 ? (
              <EmptyState
                IconComponent={WarehouseIcon}
                title="No Archived Warehouses"
                description="Warehouses you archive will appear here."
              />
            ) : (
              <div className="h-[400px] w-full overflow-x-auto rounded-md border">
                <table className="text-xs border-collapse min-w-full">
                  <thead className="sticky top-0 bg-background/90 dark:bg-card/80 backdrop-blur-sm z-10">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground break-words">Name</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground break-words">Description</th>
                       <th className="py-3 px-4 text-left font-medium text-muted-foreground whitespace-nowrap">Archived On</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedWarehouses.map((wh) => (
                      <tr key={wh.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/10 dark:hover:bg-muted/5">
                        <td className="py-3 px-4 font-medium break-words">{wh.name}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground break-words">{wh.description || 'N/A'}</td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          {wh.updatedAt ? format(new Date(wh.updatedAt), 'P p') : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => handleRestoreWarehouse(wh.id)}>
                            <RotateCcw className="mr-2 h-3 w-3" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Archived Items</CardTitle>
            <CardDescription>Items that have been moved to the archive.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading && archivedItems.length === 0 ? <LoadingSpinner className="mx-auto my-4" /> :
             archivedItems.length === 0 ? (
              <EmptyState
                IconComponent={Package}
                title="No Archived Items"
                description="Items you archive will appear here."
              />
            ) : (
              <div className="h-[400px] w-full overflow-x-auto rounded-md border">
                <table className="text-xs border-collapse min-w-full">
                  <thead className="sticky top-0 bg-background/90 dark:bg-card/80 backdrop-blur-sm z-10">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground break-words">Name</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground break-words">Warehouse</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground whitespace-nowrap">Quantity</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground whitespace-nowrap">Archived On</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedItems.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/10 dark:hover:bg-muted/5">
                        <td className="py-3 px-4 font-medium break-words">{item.name}</td>
                        <td className="py-3 px-4 break-words">{getWarehouseName(item.warehouseId)}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">{item.quantity}</td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          {item.updatedAt ? format(new Date(item.updatedAt), 'P p') : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => handleRestoreItem(item.id)}>
                            <RotateCcw className="mr-2 h-3 w-3" /> Restore
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
