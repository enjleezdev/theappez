
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { auth, db } from '@/lib/firebase';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'; // Added Form imports

const usernameFormSchema = z.object({
  newUsername: z.string().min(3, { message: 'Username must be at least 3 characters.' }),
});
type UsernameFormValues = z.infer<typeof usernameFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required.' }),
  newPassword: z.string().min(6, { message: 'New password must be at least 6 characters.' }),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ['confirmNewPassword'],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function ProfilePage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [userProfileData, setUserProfileData] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingUsername, setIsSavingUsername] = React.useState(false);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = React.useState(false);

  const usernameForm = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameFormSchema),
    defaultValues: { newUsername: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          setUserProfileData(profile);
          usernameForm.setValue('newUsername', profile.username || user.displayName || '');
        } else {
          // Should not happen if signup creates a profile, but as a fallback:
          const defaultProfile: UserProfile = {
            id: user.uid,
            username: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            usernameChanged: false,
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, defaultProfile);
          setUserProfileData(defaultProfile);
          usernameForm.setValue('newUsername', defaultProfile.username);
          console.warn("User profile created on-the-fly in profile page. This should ideally be handled at signup.");
        }
      } else {
        setCurrentUser(null);
        setUserProfileData(null);
        // router.push('/signin'); // Or handle unauthenticated state
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [usernameForm]);

  const handleUsernameChange = async (data: UsernameFormValues) => {
    if (!currentUser || !userProfileData) return;

    if (userProfileData.usernameChanged) {
      toast({ title: 'Info', description: 'Username has already been changed and cannot be changed again.', variant: 'default' });
      return;
    }
    if (data.newUsername === userProfileData.username) {
      toast({ title: 'Info', description: 'New username is the same as the current one.', variant: 'default' });
      return;
    }

    setIsSavingUsername(true);
    try {
      await updateProfile(currentUser, { displayName: data.newUsername });
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        username: data.newUsername,
        usernameChanged: true,
        updatedAt: serverTimestamp(),
      });

      setUserProfileData((prev) => prev ? { ...prev, username: data.newUsername, usernameChanged: true } : null);
      usernameForm.setValue('newUsername', data.newUsername);
      toast({ title: 'Success', description: 'Username updated successfully.' });
      window.dispatchEvent(new CustomEvent('profileUpdated')); // Notify sidebar
    } catch (error: any) {
      console.error('Failed to save username:', error);
      toast({ title: 'Error', description: error.message || 'Could not save username.', variant: 'destructive' });
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handlePasswordChange = async (data: PasswordFormValues) => {
    if (!currentUser || !currentUser.email) {
        toast({ title: 'Error', description: 'User not authenticated or email missing.', variant: 'destructive' });
        return;
    }
    setIsSavingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, data.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, data.newPassword);
      toast({ title: 'Success', description: 'Password updated successfully.' });
      passwordForm.reset();
    } catch (error: any) {
      console.error('Failed to change password:', error);
      let description = 'Could not update password. Please try again.';
      if (error.code === 'auth/wrong-password') {
        description = 'Incorrect current password.';
      } else if (error.code === 'auth/weak-password') {
        description = 'The new password is too weak.';
      }
      toast({ title: 'Error', description: description, variant: 'destructive' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner size={32} /></div>;
  }

  if (!currentUser || !userProfileData) {
    return <div className="flex justify-center items-center h-screen"><p>Please sign in to view your profile.</p></div>;
  }

  return (
    <>
      <PageHeader title="User Profile" description="Manage your account settings." />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View and manage your account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={currentUser.email || 'N/A'} disabled className="mt-1 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground mt-1">Your email address cannot be changed here.</p>
            </div>
            <Separator />
            <Form {...usernameForm}>
              <form onSubmit={usernameForm.handleSubmit(handleUsernameChange)} className="space-y-4">
                <FormField
                  control={usernameForm.control}
                  name="newUsername"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="username">Username</Label>
                      <FormControl>
                        <Input
                          id="username"
                          {...field}
                          disabled={userProfileData.usernameChanged || isSavingUsername}
                          className={userProfileData.usernameChanged ? 'cursor-not-allowed' : ''}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {userProfileData.usernameChanged
                          ? 'Your username has been set and cannot be changed again.'
                          : 'You can change your username once. This action is permanent.'}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!userProfileData.usernameChanged && (
                  <Button type="submit" disabled={isSavingUsername}>
                    {isSavingUsername ? <LoadingSpinner size={16} className="mr-2" /> : null}
                    Change Username
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password Settings</CardTitle>
            <CardDescription>Change your account password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <FormControl>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter current password"
                            {...field}
                            disabled={isSavingPassword}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="newPassword">New Password</Label>
                      <FormControl>
                        <div className="relative">
                          <Input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter new password (min. 6 characters)"
                              {...field}
                              disabled={isSavingPassword}
                          />
                          <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={passwordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                      <FormControl>
                        <div className="relative">
                            <Input
                                id="confirmNewPassword"
                                type={showConfirmNewPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                {...field}
                                disabled={isSavingPassword}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                            >
                                {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                       </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? <LoadingSpinner size={16} className="mr-2" /> : null}
                  Change Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    