
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const warehouseFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Warehouse name must be at least 2 characters.',
  }),
  description: z.string().optional(),
});

type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

export default function NewWarehousePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (!user) {
        // Redirect to sign-in if not authenticated, though layout should also handle this
        router.push('/signin');
      }
    });
    return () => unsubscribe();
  }, [router]);

  async function onSubmit(data: WarehouseFormValues) {
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a warehouse.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const newWarehouseData = {
      name: data.name,
      description: data.description || '',
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ownerId: currentUser.uid, // Add ownerId
    };

    try {
      await addDoc(collection(db, "warehouses"), newWarehouseData);
      toast({ title: "Warehouse Created", description: `${data.name} has been successfully created.` });
      router.push('/warehouses');
    } catch (error) {
      console.error("Error adding warehouse to Firestore: ", error);
      toast({ title: "Error", description: "Failed to save warehouse. Please try again.", variant: "destructive" });
      setIsSaving(false);
    }
  }

  if (isAuthLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner size={32} /></div>;
  }

  if (!currentUser) {
    // This case should ideally be handled by redirection or a specific "not authenticated" UI
    return <div className="flex justify-center items-center h-screen"><p>Please sign in to continue.</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Create New Warehouse"
        description="Fill in the details below to add a new warehouse."
        actions={
          <Button variant="outline" asChild>
            <Link href="/warehouses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Warehouses
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Name</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder=""
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => router.push('/warehouses')} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <LoadingSpinner size={16} className="mr-2" /> : null}
                  Save Warehouse
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
