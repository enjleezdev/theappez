
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import ReactDOM from 'react-dom/client';
import { doc, getDoc, collection, addDoc, updateDoc, arrayUnion, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';


import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, PackagePlus, History as HistoryIcon, Printer, Trash2, PlusCircle, MinusCircle, MapPin } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Item, Warehouse, HistoryEntry, ArchivedReport } from '@/lib/types';
import { PrintableItemReport } from '@/components/PrintableItemReport';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


const itemFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Item name must be at least 2 characters.',
  }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int('Quantity must be an integer.')
    .min(0, { message: 'Quantity must be a non-negative number.'}),
  location: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

const stockAdjustmentFormSchema = z.object({
  adjustmentQuantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int('Quantity must be an integer.')
    .positive({ message: 'Adjustment quantity must be a positive number.' }),
  comment: z.string().optional(),
});

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentFormSchema>;

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

const updateWarehouseTimestampInFirestore = async (warehouseId: string) => {
  if (!warehouseId) {
    console.error("updateWarehouseTimestampInFirestore: warehouseId is missing");
    return;
  }
  try {
    const warehouseDocRef = doc(db, "warehouses", warehouseId);
    await updateDoc(warehouseDocRef, {
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to update warehouse timestamp in Firestore", error);
  }
};


export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const warehouseIdFromParams = params.warehouseId as string;

  const [warehouse, setWarehouse] = React.useState<Warehouse | null>(null);
  const [items, setItems] = React.useState<Item[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = React.useState(false);
  
  const [isStockAdjustmentDialogOpen, setIsStockAdjustmentDialogOpen] = React.useState(false);
  const [itemForAdjustment, setItemForAdjustment] = React.useState<Item | null>(null);
  const [adjustmentType, setAdjustmentType] = React.useState<'ADD_STOCK' | 'CONSUME_STOCK' | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = React.useState<Item | null>(null);
  const [itemToArchive, setItemToArchive] = React.useState<Item | null>(null);

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      quantity: 1,
      location: '',
    },
  });

  const stockAdjustmentForm = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentFormSchema),
    defaultValues: {
      adjustmentQuantity: 1,
      comment: '',
    },
  });

  const loadWarehouseAndItems = React.useCallback(async (idToLoad: string) => {
    if (!idToLoad) {
      toast({ title: "Error", description: "Warehouse ID is missing.", variant: "destructive" });
      router.push('/warehouses');
      return;
    }
    setIsLoading(true);
    try {
      const warehouseDocRef = doc(db, "warehouses", idToLoad);
      const docSnap = await getDoc(warehouseDocRef);

      if (!docSnap.exists() || docSnap.data().isArchived) {
        toast({
          title: "Warehouse Not Found",
          description: `The requested warehouse (ID: ${idToLoad}) does not exist or has been archived. You will be redirected.`,
          variant: "destructive",
          duration: 4000,
        });
        setTimeout(() => {
          router.push('/warehouses');
        }, 1500);
        setWarehouse(null);
        setItems([]);
        setIsLoading(false);
        return;
      }

      const warehouseData = docSnap.data() as Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'> & { createdAt?: Timestamp, updatedAt?: Timestamp };
      setWarehouse({
        id: docSnap.id,
        name: warehouseData.name,
        description: warehouseData.description,
        isArchived: warehouseData.isArchived,
        createdAt: warehouseData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: warehouseData.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        ownerId: "placeholder-owner-id",
      });
      
      const itemsQuery = query(
        collection(db, "items"),
        where("warehouseId", "==", idToLoad),
        where("isArchived", "==", false)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const warehouseItems = itemsSnapshot.docs.map(itemDoc => {
        const itemData = itemDoc.data();
        return {
          id: itemDoc.id,
          ...itemData,
          history: (itemData.history || []).map((h: any) => ({
            ...h,
            timestamp: h.timestamp?.toDate ? h.timestamp.toDate().toISOString() : (typeof h.timestamp === 'string' ? h.timestamp : new Date().toISOString()),
          })),
          createdAt: itemData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: itemData.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        } as Item;
      });
      setItems(warehouseItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));

      if (selectedItemForHistory) {
        const updatedSelectedItem = warehouseItems.find(item => item.id === selectedItemForHistory.id);
        setSelectedItemForHistory(updatedSelectedItem || null);
      }

    } catch (error) {
      console.error("Failed to load data from Firestore", error);
      toast({ title: "Error", description: "Failed to load warehouse data.", variant: "destructive" });
       router.push('/warehouses');
    } finally {
      setIsLoading(false);
    }
  }, [router, toast, selectedItemForHistory]); 

  React.useEffect(() => {
    if (warehouseIdFromParams) {
      loadWarehouseAndItems(warehouseIdFromParams);
    }
  }, [warehouseIdFromParams, loadWarehouseAndItems]);


 async function onAddItemSubmit(data: ItemFormValues) {
    if (!warehouseIdFromParams || !warehouse) return;

    const now = new Date();
    const initialHistoryEntry: HistoryEntry = {
      id: Date.now().toString() + '-hist-create', 
      type: 'CREATE_ITEM',
      change: data.quantity,
      quantityBefore: 0,
      quantityAfter: data.quantity,
      timestamp: now.toISOString(),
      comment: 'Initial item creation',
    };

    const newItemData = {
      warehouseId: warehouseIdFromParams,
      name: data.name,
      quantity: data.quantity,
      location: data.location || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      history: [initialHistoryEntry], 
      isArchived: false,
    };

    try {
      await addDoc(collection(db, "items"), newItemData);
      toast({ title: "Item Added", description: `${data.name} has been added to ${warehouse?.name}.` });
      setIsAddItemDialogOpen(false); 
      itemForm.reset({ name: '', quantity: 1, location: '' }); 
      loadWarehouseAndItems(warehouseIdFromParams); 
      await updateWarehouseTimestampInFirestore(warehouseIdFromParams);
    } catch (error) {
      console.error("Failed to save item to Firestore", error);
      toast({ title: "Error", description: "Failed to save item. Please try again.", variant: "destructive" });
    }
  }

  const handleOpenStockAdjustmentDialog = (item: Item, type: 'ADD_STOCK' | 'CONSUME_STOCK') => {
    setItemForAdjustment(item);
    setAdjustmentType(type);
    stockAdjustmentForm.reset({ adjustmentQuantity: 1, comment: '' });
    setIsStockAdjustmentDialogOpen(true);
  };

  async function onStockAdjustmentSubmit(data: StockAdjustmentFormValues) {
    if (!itemForAdjustment || !adjustmentType || !warehouseIdFromParams) return;

    const quantityChange = adjustmentType === 'ADD_STOCK' ? data.adjustmentQuantity : -data.adjustmentQuantity;
    
    if (adjustmentType === 'CONSUME_STOCK' && itemForAdjustment.quantity < data.adjustmentQuantity) {
      stockAdjustmentForm.setError("adjustmentQuantity", {
        type: "manual",
        message: `Cannot consume more than available stock (${itemForAdjustment.quantity}).`,
      });
      return;
    }

    const now = new Date();
    const newHistoryEntry: HistoryEntry = {
      id: Date.now().toString() + '-hist-adjust',
      type: adjustmentType,
      change: quantityChange,
      quantityBefore: itemForAdjustment.quantity,
      quantityAfter: itemForAdjustment.quantity + quantityChange,
      timestamp: now.toISOString(),
      comment: data.comment || (adjustmentType === 'ADD_STOCK' ? 'Stock added' : 'Stock consumed'),
    };

    const itemDocRef = doc(db, "items", itemForAdjustment.id);

    try {
      await updateDoc(itemDocRef, {
        quantity: itemForAdjustment.quantity + quantityChange,
        updatedAt: serverTimestamp(),
        history: arrayUnion(newHistoryEntry) 
      });

      toast({ title: "Stock Updated", description: `Stock for ${itemForAdjustment.name} has been updated.` });
      setIsStockAdjustmentDialogOpen(false);
      stockAdjustmentForm.reset();
      loadWarehouseAndItems(warehouseIdFromParams); 
      await updateWarehouseTimestampInFirestore(warehouseIdFromParams);
    } catch (error) {
      console.error("Failed to update item stock in Firestore", error);
      toast({ title: "Error", description: "Failed to update stock. Please try again.", variant: "destructive" });
    }
  }
  
  const handleShowHistory = (item: Item) => {
    if (selectedItemForHistory?.id === item.id) {
      setSelectedItemForHistory(null); 
    } else {
      setSelectedItemForHistory(item);
    }
  };

  const handlePrintReport = (itemToPrint: Item) => {
    if (!warehouse || !itemToPrint) {
      toast({ title: "Print Error", description: "Warehouse or item data is missing.", variant: "destructive"});
      return;
    }

    const printableArea = document.createElement('div');
    printableArea.id = 'printable-report-area'; 
    document.body.appendChild(printableArea);

    const root = ReactDOM.createRoot(printableArea);
    root.render(
      <PrintableItemReport
        warehouseName={warehouse.name}
        item={itemToPrint}
        printedBy="Admin User" 
        printDate={new Date()}
      />
    );

    setTimeout(() => {
      // window.print();
      // Convert the HTML content to PDF using html2pdf.js
      const element = document.getElementById('printable-content');
      if (element) {
        // @ts-ignore
        html2pdf().from(element).save(`${itemToPrint.name}-report.pdf`);
      }

      setTimeout(() => {
        root.unmount();
        if (document.body.contains(printableArea)) {
          document.body.removeChild(printableArea);
        }
        
        const now = new Date();
        const archivedReport: ArchivedReport = {
          id: `${itemToPrint.id}-${now.getTime()}`,
          reportType: 'ITEM',
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          itemId: itemToPrint.id,
          itemName: itemToPrint.name,
          printedBy: "Admin User", 
          printedAt: now.toISOString(),
          historySnapshot: JSON.parse(JSON.stringify(itemToPrint.history || [])), 
        };

        try {
          const existingReportsString = localStorage.getItem('archivedReports');
          const existingReports: ArchivedReport[] = existingReportsString
            ? JSON.parse(existingReportsString)
            : [];
          existingReports.push(archivedReport);
          localStorage.setItem('archivedReports', JSON.stringify(existingReports));
          toast({
            title: "Report Archived",
            description: `Report for item ${itemToPrint.name} has been saved.`,
          });
        } catch (error) {
          console.error("Failed to archive report:", error);
          toast({
            title: "Archiving Error",
            description: "Failed to save report due to an error.",
            variant: "destructive",
          });
        }
      }, 3000); 
    }, 250); 
  };

  const handleArchiveItem = async () => {
    if (!itemToArchive || !warehouseIdFromParams) return;
    const itemDocRef = doc(db, "items", itemToArchive.id);
    try {
      await updateDoc(itemDocRef, {
        isArchived: true,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Item Archived", description: `${itemToArchive.name} has been moved to the archive.` });
      setItemToArchive(null); 
      loadWarehouseAndItems(warehouseIdFromParams); 
      await updateWarehouseTimestampInFirestore(warehouseIdFromParams);
    } catch (error) {
      console.error("Failed to archive item in Firestore", error);
      toast({ title: "Error", description: "Failed to archive item.", variant: "destructive" });
    }
  };

  if (isLoading && !warehouse) { 
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><LoadingSpinner size={48} /></div>;
  }

  if (!warehouse) {
    return (
       <div className="flex h-full w-full items-center justify-center">
         <p>Warehouse data could not be loaded. You may be redirected shortly.</p>
       </div>
    );
  }

  return (
    <TooltipProvider>
      <AlertDialog open={!!itemToArchive} onOpenChange={(isOpen) => {
        if (!isOpen) setItemToArchive(null);
      }}>
      <PageHeader
        title={warehouse.name}
        description={warehouse.description || "Manage items and details for this warehouse."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/warehouses">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Warehouses
              </Link>
            </Button>
            <Button onClick={() => setIsAddItemDialogOpen(true)}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        }
      />
      
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>All items currently stored in {warehouse.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && items.length === 0 ? <div className="flex justify-center py-4"><LoadingSpinner/></div> :
          items.length === 0 ? (
            <EmptyState
              IconComponent={PackagePlus}
              title="No Items Yet"
              description="Start by adding your first item to this warehouse."
              action={{
                label: "Add Item",
                onClick: () => setIsAddItemDialogOpen(true),
                icon: PackagePlus,
              }}
            />
          ) : (
            <Table className="table-fixed w-full">
               <TableHeader>
                <TableRow>
                  <TableHead className="w-full text-left">Item Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    <TableRow className={cn("hover:bg-muted/30", selectedItemForHistory?.id === item.id ? 'bg-muted/50 border-b-0' : '')}>
                      <TableCell className="py-3 px-4 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-semibold text-base break-words">{item.name}</span>
                          <span className="text-sm text-muted-foreground">
                            Quantity: {item.quantity}
                          </span>
                          {item.location && (
                            <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                <MapPin className="h-3 w-3 mr-1.5" />
                                <span>{item.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-0.5 flex-wrap mt-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenStockAdjustmentDialog(item, 'ADD_STOCK')} aria-label={`Add stock to ${item.name}`}>
                                  <PlusCircle className="h-5 w-5 text-green-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Add Stock</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenStockAdjustmentDialog(item, 'CONSUME_STOCK')} aria-label={`Consume stock from ${item.name}`}>
                                  <MinusCircle className="h-5 w-5 text-red-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Consume Stock</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleShowHistory(item)} aria-label={`View history for ${item.name}`} className={selectedItemForHistory?.id === item.id ? 'bg-accent text-accent-foreground' : ''}>
                                  <HistoryIcon className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>View History</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" onClick={() => handlePrintReport(item)} aria-label={`Print report for ${item.name}`}>
                                  <Printer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Print Report</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setItemToArchive(item)} aria-label={`Archive ${item.name}`}>
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p>Archive Item</p></TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    {selectedItemForHistory?.id === item.id && item.history && (
                       <TableRow className="bg-muted/20 hover:bg-muted/30">
                         <TableCell className="p-0 overflow-hidden">
                           <div className="h-full w-full overflow-auto">
                             <div className="p-4 space-y-3"> 
                                <h4 className="text-md font-semibold text-foreground text-left">
                                Transaction History: <span className="font-bold">{item.name}</span>
                                </h4>
                                {item.history.length > 0 ? (
                                    <table className="text-xs border-collapse min-w-full"> 
                                    <thead className="sticky top-0 bg-muted/80 dark:bg-muted/60 backdrop-blur-sm z-10">
                                        <tr>
                                        <th className="py-1.5 px-3 text-left font-medium text-muted-foreground whitespace-nowrap">Date</th>
                                        <th className="py-1.5 px-3 text-left font-medium text-muted-foreground whitespace-nowrap">Type</th>
                                        <th className="py-1.5 px-3 text-center font-medium text-muted-foreground whitespace-nowrap">Change</th>
                                        <th className="py-1.5 px-3 text-center font-medium text-muted-foreground whitespace-nowrap">Before</th>
                                        <th className="py-1.5 px-3 text-center font-medium text-muted-foreground whitespace-nowrap">After</th>
                                        <th className="py-1.5 px-3 text-left font-medium text-muted-foreground min-w-[150px] whitespace-normal break-words">Comment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...(item.history || [])].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((entry) => (
                                        <tr key={entry.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/10 dark:hover:bg-muted/5">
                                            <td className="py-1.5 px-3 whitespace-nowrap">{format(new Date(entry.timestamp), "P p")}</td>
                                            <td className="py-1.5 px-3 whitespace-nowrap">
                                            <span className={cn(
                                              'px-2 py-0.5 rounded-full text-xs',
                                                entry.type === 'CREATE_ITEM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                                                entry.type === 'ADD_STOCK' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                                                entry.type === 'CONSUME_STOCK' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' :
                                                entry.type === 'ADJUST_STOCK' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                                            )}>
                                                {translateHistoryType(entry.type)}
                                            </span>
                                            </td>
                                            <td className={cn(
                                              'py-1.5 px-3 text-center font-medium whitespace-nowrap',
                                              entry.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                            )}>
                                            {entry.change > 0 ? `+${entry.change}` : entry.change}
                                            </td>
                                            <td className="py-1.5 px-3 text-center whitespace-nowrap">{entry.quantityBefore}</td>
                                            <td className="py-1.5 px-3 text-center font-semibold whitespace-nowrap">{entry.quantityAfter}</td>
                                            <td className="py-1.5 px-3 text-muted-foreground min-w-[150px] whitespace-normal break-words">{entry.comment || 'N/A'}</td>
                                        </tr>
                                        ))}
                                    </tbody>
                                    </table>
                                ) : (
                                <p className="text-sm text-muted-foreground p-4 text-center">No transaction history for this item.</p>
                                )}
                            </div>
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddItemDialogOpen} onOpenChange={(isOpen) => {
        setIsAddItemDialogOpen(isOpen);
        if (!isOpen) {
            itemForm.reset({ name: '', quantity: 1, location: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Item to {warehouse?.name}</DialogTitle>
            <DialogDescription>
              Fill in the details below to add a new item to this warehouse.
            </DialogDescription>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onAddItemSubmit)} className="space-y-4 py-4">
              <FormField
                control={itemForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Product A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Location (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Shelf A1, Rack B2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Item</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isStockAdjustmentDialogOpen} onOpenChange={(isOpen) => {
        setIsStockAdjustmentDialogOpen(isOpen);
        if (!isOpen) {
            stockAdjustmentForm.reset(); 
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'ADD_STOCK' ? 'Add Stock to ' : 'Consume Stock from '} 
              {itemForAdjustment?.name}
            </DialogTitle>
            <DialogDescription>
              Current quantity: {itemForAdjustment?.quantity}. Enter the quantity to {adjustmentType === 'ADD_STOCK' ? 'add.' : 'consume.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...stockAdjustmentForm}>
            <form onSubmit={stockAdjustmentForm.handleSubmit(onStockAdjustmentSubmit)} className="space-y-4 py-4">
              <FormField
                control={stockAdjustmentForm.control}
                name="adjustmentQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity to {adjustmentType === 'ADD_STOCK' ? 'add' : 'consume'}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockAdjustmentForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Received new shipment, Order #123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">
                  {adjustmentType === 'ADD_STOCK' ? 'Add Stock' : 'Consume Stock'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {itemToArchive && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Item "{itemToArchive.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will move the item to the archive. You can restore it later.
              This will not delete its transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToArchive(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveItem} className="bg-destructive hover:bg-destructive/90">
              Archive Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
      </AlertDialog>
    </TooltipProvider>
  );
}
