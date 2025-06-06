
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bot, Lightbulb, AlertTriangle, Languages } from 'lucide-react';
import type { Item, Warehouse } from '@/lib/types';
import { stockLevelSuggestions, type StockLevelSuggestionsInput, type StockLevelSuggestionsOutput } from '@/ai/flows/stock-level-suggestions';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const suggestionFormSchema = z.object({
  warehouseId: z.string().min(1, { message: "Please select a warehouse." }),
  itemId: z.string().min(1, { message: "Please select an item." }),
  historicalData: z.string().min(10, { message: "Please provide some historical data (at least 10 characters)." }),
});

type SuggestionFormValues = z.infer<typeof suggestionFormSchema>;

export default function EnjleezAIAssistantPage() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [allItems, setAllItems] = React.useState<Item[]>([]);
  const [itemsInSelectedWarehouse, setItemsInSelectedWarehouse] = React.useState<Item[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [suggestionResult, setSuggestionResult] = React.useState<StockLevelSuggestionsOutput & { itemNameAnalyzed?: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<SuggestionFormValues>({
    resolver: zodResolver(suggestionFormSchema),
    defaultValues: {
      warehouseId: '',
      itemId: '',
      historicalData: '',
    },
  });

  const selectedWarehouseId = form.watch('warehouseId');

  React.useEffect(() => {
    setIsLoadingData(true);
    try {
      const storedWarehousesString = localStorage.getItem('warehouses');
      if (storedWarehousesString) {
        setWarehouses(JSON.parse(storedWarehousesString));
      }
      const storedItemsString = localStorage.getItem('items');
      if (storedItemsString) {
        setAllItems(JSON.parse(storedItemsString));
      }
    } catch (err) {
      console.error("Failed to load initial data from localStorage", err);
      toast({ title: "Error", description: "Failed to load warehouse/item data.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (selectedWarehouseId) {
      const filteredItems = allItems.filter(item => item.warehouseId === selectedWarehouseId);
      setItemsInSelectedWarehouse(filteredItems);
      form.setValue('itemId', '');
    } else {
      setItemsInSelectedWarehouse([]);
    }
  }, [selectedWarehouseId, allItems, form]);

  async function onSubmit(data: SuggestionFormValues) {
    setIsLoading(true);
    setSuggestionResult(null);
    setError(null);
    try {
      const selectedItem = itemsInSelectedWarehouse.find(item => item.id === data.itemId);
      if (!selectedItem) {
        setError("Selected item not found. Please re-select.");
        setIsLoading(false);
        return;
      }

      const input: StockLevelSuggestionsInput = {
        itemId: selectedItem.name,
        historicalData: `Item: ${selectedItem.name}. User input: ${data.historicalData}. Current Stock: ${selectedItem.quantity}. Item History (last 5 if available): ${
          selectedItem.history?.slice(-5).map(h =>
            `${h.type.replace('_', ' ')} of ${h.change} on ${new Date(h.timestamp).toLocaleDateString()}. Comment: ${h.comment || 'N/A'}`
          ).join('; ') || 'No detailed history available.'
        }`,
      };

      const result = await stockLevelSuggestions(input);
      setSuggestionResult({...result, itemNameAnalyzed: selectedItem.name});

    } catch (err) {
      console.error("Error getting stock suggestion:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      toast({ title: "AI Suggestion Error", description: "Could not retrieve stock suggestion.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingData) {
    return <LoadingSpinner className="mx-auto my-10" size={48} />;
  }

  return (
    <>
      <PageHeader
        title="Enjleez AI Assistant"
        description="Get AI-powered insights and suggestions for your inventory."
        actions={
          <Button variant="outline" disabled>
            <Bot className="mr-2 h-4 w-4" />
            Powered by Genkit
          </Button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Suggestion</CardTitle>
            <CardDescription>Select an item and provide historical data to get a suggestion.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="warehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a warehouse" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehouses.map(wh => (
                            <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedWarehouseId || itemsInSelectedWarehouse.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedWarehouseId ? "Select warehouse first" : "Select an item"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {itemsInSelectedWarehouse.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name} (Current: {item.quantity})</SelectItem>
                          ))}
                           {selectedWarehouseId && itemsInSelectedWarehouse.length === 0 && (
                            <div className="p-4 text-sm text-muted-foreground">No items in this warehouse.</div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="historicalData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Historical Data / Trends</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Sales increased by 20% last quarter, supplier lead times are now 2 weeks longer, expect high demand for upcoming holiday season..."
                          className="resize-y min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <LoadingSpinner size={16} className="mr-2" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                  Get Suggestion
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>AI Suggestion</CardTitle>
            <CardDescription>The AI's recommendation will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col items-center justify-center">
            {isLoading && <LoadingSpinner size={32} />}
            {!isLoading && error && (
              <div className="text-center text-destructive">
                <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
            {!isLoading && !error && suggestionResult && (
              <div className="space-y-4 text-center w-full">
                <Lightbulb className="mx-auto h-12 w-12 text-primary mb-2" />
                <p className="text-2xl font-bold text-primary">
                  Suggested Stock Level: {suggestionResult.suggestedStockLevel}
                </p>
                <div className="text-left space-y-3 bg-muted p-4 rounded-md text-sm">
                  <div>
                    <strong className="font-medium text-foreground block mb-1">Reasoning (English):</strong>
                    <p>{suggestionResult.reasoning.en}</p>
                  </div>
                  <div dir="rtl">
                    <strong className="font-medium text-foreground block mb-1">الأساس المنطقي (العربية):</strong>
                    <p>{suggestionResult.reasoning.ar}</p>
                  </div>

                  {suggestionResult.alert && (suggestionResult.alert.en || suggestionResult.alert.ar) && (
                    <>
                      {suggestionResult.alert.en && (
                        <p className="text-amber-700 dark:text-amber-500 mt-2"><strong className="font-medium">Alert (English):</strong> {suggestionResult.alert.en}</p>
                      )}
                      {suggestionResult.alert.ar && (
                        <p dir="rtl" className="text-amber-700 dark:text-amber-500 mt-1"><strong className="font-medium">تنبيه (العربية):</strong> {suggestionResult.alert.ar}</p>
                      )}
                    </>
                  )}
                </div>
                 <p className="text-xs text-muted-foreground pt-4">
                    Item Analyzed: {suggestionResult.itemNameAnalyzed || "N/A"}
                </p>
              </div>
            )}
            {!isLoading && !error && !suggestionResult && (
              <div className="text-center text-muted-foreground">
                <Bot className="mx-auto h-12 w-12 mb-2" />
                <p>Fill out the form to get a stock level suggestion.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
