
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Home, Warehouse, Package, FileText, Archive as ArchiveIcon, UserCircle, Bot, LogOut } from "lucide-react";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth"; // Import User type
import { doc, getDoc } from "firebase/firestore";


import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent, 
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UserProfile }  from "@/lib/types"; // Keep this for structure if needed elsewhere
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const [currentUser, setCurrentUser] = React.useState<FirebaseUser | null>(null);
  const [profileUsername, setProfileUsername] = React.useState<string | null>("User");
  const [profileEmail, setProfileEmail] = React.useState<string | null>("user@example.com");


  const loadProfileData = React.useCallback(async (user: FirebaseUser | null) => {
    if (user) {
      setCurrentUser(user);
      setProfileEmail(user.email || "user@example.com");

      // Attempt to get username from Firestore first, then fallback to displayName or email part
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const firestoreProfile = userDocSnap.data() as UserProfile;
        setProfileUsername(firestoreProfile.username || user.displayName || user.email?.split('@')[0] || "User");
      } else {
        setProfileUsername(user.displayName || user.email?.split('@')[0] || "User");
      }

    } else {
      setCurrentUser(null);
      setProfileUsername("User");
      setProfileEmail("user@example.com");
    }
  }, []);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      loadProfileData(user);
    });
    
    const handleProfileUpdate = () => {
      if (auth.currentUser) {
        loadProfileData(auth.currentUser);
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [loadProfileData]);


  const isActive = (path: string) => {
    if (path.includes("[") && path.includes("]")) {
      const basePath = path.substring(0, path.indexOf("["));
      return pathname.startsWith(basePath);
    }
    if (path === "/reports" && pathname.startsWith("/reports")) return true;
    if (path === "/archive" && pathname.startsWith("/archive")) return true;
    return pathname === path || (path !== "/" && pathname.startsWith(path));
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/signin');
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        title: "Logout Failed",
        description: "Could not log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
       <SidebarHeader className={cn(
        "flex items-center h-14", 
        state === 'collapsed' ? 'justify-center px-2' : 'px-4 justify-start'
      )}>
        {/* Empty as per user request to remove logo/name from here */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/warehouses")}
              tooltip={state === "collapsed" ? "Warehouses" : undefined}
              onClick={handleLinkClick}
            >
              <Link href="/warehouses">
                <Warehouse />
                <span>Warehouses</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/reports")}
              tooltip={state === "collapsed" ? "Reports" : undefined}
              onClick={handleLinkClick}
            >
              <Link href="/reports">
                <FileText />
                <span>Reports</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/archive")}
              tooltip={state === "collapsed" ? "Archive" : undefined}
              onClick={handleLinkClick}
            >
              <Link href="/archive">
                <ArchiveIcon />
                <span>Archive</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/profile")}
              tooltip={state === "collapsed" ? "Profile" : undefined}
              onClick={handleLinkClick}
            >
              <Link href="/profile">
                <UserCircle />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarGroup className="pt-4">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:justify-center">
              AI Tools
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/ai/stock-suggestions")}
                  tooltip={state === "collapsed" ? "Enjleez AI Assistant" : undefined}
                  onClick={handleLinkClick}
                >
                  <Link href="/ai/stock-suggestions">
                    <Bot />
                    <span>Enjleez AI Assistant</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroupContent>
          </SidebarGroup>
          
          <SidebarMenuItem className="mt-auto absolute bottom-16 w-[calc(100%-1rem)] group-data-[collapsible=icon]:w-[calc(100%-0.5rem)]">
            <Separator className="my-2" />
             <SidebarMenuButton
              onClick={handleSignOut}
              tooltip={state === "collapsed" ? "Log Out" : undefined}
              variant="default" 
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="mt-auto">
        <Separator className="my-2" />
         <div className={cn(
            "flex items-center gap-3 p-2 transition-all",
            state === "collapsed" && "justify-center"
          )}>
            <Avatar className="size-8">
              <AvatarImage src={currentUser?.photoURL || "https://placehold.co/40x40.png"} alt="User" data-ai-hint="user avatar"/>
              <AvatarFallback>{profileUsername ? profileUsername.substring(0, 2).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
            <div className={cn(
              "flex flex-col transition-[opacity] overflow-hidden",
              state === "collapsed" && "opacity-0 hidden"
            )}>
              <span className="text-sm font-medium text-sidebar-foreground text-ellipsis whitespace-nowrap">{profileUsername || "User"}</span>
              <span className="text-xs text-muted-foreground text-ellipsis whitespace-nowrap">{profileEmail || "user@example.com"}</span>
            </div>
          </div>
      </SidebarFooter>
    </Sidebar>
  );
}

    