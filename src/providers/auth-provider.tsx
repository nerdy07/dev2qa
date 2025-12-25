
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import type { User as AuthUser } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

import type { User, Role } from '@/lib/types';
import { auth, db, firebaseInitialized } from '@/lib/firebase';
import { TriangleAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { PERMISSIONS_BY_ROLE, ROLES } from '@/lib/roles';
import { collection, onSnapshot } from 'firebase/firestore';
import { saveSession, clearSession } from '@/lib/session';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
  rolesLoading: boolean;
  sendPasswordReset: (email: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  customRoles: Map<string, Role>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          throw error;
        }, 0);
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}


function MissingFirebaseConfig() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8 text-center">
            <div className="w-full max-w-3xl rounded-xl border-2 border-destructive bg-card p-6 shadow-2xl sm:p-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <TriangleAlert className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-destructive">Firebase Configuration Missing</h1>
                <p className="mt-4 text-card-foreground">
                    Your Firebase environment variables are not set correctly. The application cannot connect to Firebase services without them.
                </p>
                <p className="mt-2 text-muted-foreground">
                    Please create a <code className="bg-muted px-1 py-0.5 rounded-sm">.env</code> file in the project root and add your Firebase configuration.
                </p>
                <div className="mt-6 w-full overflow-x-auto rounded-md bg-muted p-4 text-left text-sm font-mono">
                    <pre className="text-muted-foreground">
{`NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef..."`}
                    </pre>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                    You can find these values in your Firebase project settings under &quot;General&quot; &gt; &quot;Your apps&quot; &gt; &quot;Web app&quot;. After adding them, you may need to restart the development server.
                </p>
            </div>
        </div>
    );
}

const FullPageSkeleton = () => (
    <div className="flex min-h-screen w-full bg-background" suppressHydrationWarning>
        <div className="hidden h-screen w-64 flex-col border-r bg-card shadow-sm md:flex">
            <div className="flex h-16 items-center border-b px-6">
                <Skeleton className="h-8 w-32" />
            </div>
            <div className="flex-1 overflow-y-auto">
                <nav className="grid items-start gap-1 px-4 py-4 text-sm font-medium">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                    ))}
                </nav>
            </div>
        </div>
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
            <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
                    <div className="grid gap-1">
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-5 w-80" />
                    </div>
                </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-[109px] w-full" />
                <Skeleton className="h-[109px] w-full" />
                <Skeleton className="h-[109px] w-full" />
                <Skeleton className="h-[109px] w-full" />
              </div>
              <div className="mt-8">
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="rounded-lg border shadow-sm">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-5 w-32" /></th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell"><Skeleton className="h-5 w-24" /></th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle"><Skeleton className="h-5 w-40" /></td>
                                        <td className="p-4 align-middle hidden md:table-cell"><Skeleton className="h-5 w-28" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
            </div>
        </main>
    </div>
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [customRoles, setCustomRoles] = useState<Map<string, Role>>(new Map());
  const [rolesLoading, setRolesLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load custom roles from Firestore with real-time updates
  useEffect(() => {
    if (!firebaseInitialized || !db || !auth) {
      setRolesLoading(false);
      return;
    }

    // Wait for user to be authenticated before loading roles
    // This ensures Firestore security token is valid
    if (!user && loading) {
      // Still loading auth state, wait
      return;
    }

    // If user is not authenticated, don't try to load roles
    if (!user) {
      setRolesLoading(false);
      return;
    }

    setRolesLoading(true);
    const rolesCollection = collection(db, 'roles');
    
    // Set a timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      console.warn('Roles loading timeout after 10 seconds - releasing loading state');
      // Set empty map first, then rolesLoading
      setCustomRoles(new Map());
      requestAnimationFrame(() => {
        setRolesLoading(false);
      });
    }, 10000); // 10 second timeout
    
    const unsubscribe = onSnapshot(
      rolesCollection,
      (snapshot) => {
        try {
          clearTimeout(timeoutId);
          const rolesMap = new Map<string, Role>();
          snapshot.forEach((doc) => {
            const role = { id: doc.id, ...doc.data() } as Role;
            if (!role.name) {
              console.warn('Role document missing name field:', doc.id);
              return;
            }
            
            // Store role with multiple key variations for flexible matching
            const name = role.name;
            const normalizedName = name.toLowerCase().trim();
            const nameWithoutUnderscores = normalizedName.replace(/_/g, '');
            const nameWithUnderscores = normalizedName.replace(/\s+/g, '_');
            const nameWithoutSpaces = normalizedName.replace(/\s+/g, '');
            
            // Handle singular/plural variations (e.g., qa_tester <-> qa_testers, Designer <-> Designers)
            const singularVariation = normalizedName.replace(/s$/, ''); // Remove trailing 's'
            const pluralVariation = normalizedName.endsWith('s') ? normalizedName : normalizedName + 's'; // Add 's' only if not already plural
            
            // Generate all possible key variations for this role
            const allKeyVariations = [
              normalizedName,                    // "designers"
              nameWithoutUnderscores,            // "designers"
              nameWithUnderscores,               // "designers"
              nameWithoutSpaces,                 // "designers"
              singularVariation,                 // "designer"
              pluralVariation,                   // "designerss" (if already plural, or "designers" if singular)
              name,                              // Original case: "Designers"
              name.toLowerCase(),                // "designers"
              name.toUpperCase(),                // "DESIGNERS"
              name.charAt(0).toUpperCase() + normalizedName.slice(1), // "Designers"
            ];
            
            // Store the role with all possible key variations
            allKeyVariations.forEach(key => {
              if (key && key.trim()) {
                rolesMap.set(key.toLowerCase(), role);
              }
            });
            
            // Also store original case variations
            rolesMap.set(name, role);
            rolesMap.set(name.toLowerCase(), role);
            rolesMap.set(name.toUpperCase(), role);
            
            // Log in development for debugging
            if (process.env.NODE_ENV === 'development') {
              console.log(`Loaded custom role: "${role.name}" with ${role.permissions?.length || 0} permissions`);
            }
          });
          
          // Set customRoles first, then use requestAnimationFrame to ensure state is updated
          // before setting rolesLoading to false. This prevents race condition where dashboard
          // renders before permissions are calculated.
          setCustomRoles(rolesMap);
          
          // Use requestAnimationFrame to ensure customRoles state is committed before
          // setting rolesLoading to false, allowing userPermissions useMemo to recalculate
          requestAnimationFrame(() => {
            setRolesLoading(false);
          });
          
          // Log summary in development
          if (process.env.NODE_ENV === 'development') {
            const uniqueRoles = new Set(Array.from(rolesMap.values()).map(r => r.name));
            console.log(`✓ Loaded ${uniqueRoles.size} custom roles (stored with ${rolesMap.size} key variations)`);
            if (uniqueRoles.size > 0) {
              console.log(`  Role names: ${Array.from(uniqueRoles).join(', ')}`);
            }
          }
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('Error processing roles:', error);
          // Set empty map on error so permissions still work (just without custom roles)
          setCustomRoles(new Map());
          requestAnimationFrame(() => {
            setRolesLoading(false);
          });
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('Error loading custom roles:', error);
        // Set empty map on error so permissions still work (just without custom roles)
        setCustomRoles(new Map());
        requestAnimationFrame(() => {
          setRolesLoading(false);
        });
      }
    );
    
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [firebaseInitialized, db, auth, user, loading]);

  const userPermissions = useMemo(() => {
    if (!user) return [];
    
    const allPermissions = new Set<string>();
    
    // All authenticated users get profile:read permission by default
    allPermissions.add('profile:read');
    
    // PRIMARY: Use permissions directly from user document (new permission-based system)
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      user.permissions.forEach(perm => {
        if (perm && typeof perm === 'string' && perm.trim()) {
          allPermissions.add(perm.trim());
        }
      });
      
      // If user has direct permissions, use them and skip role-based derivation
      const finalPermissions = Array.from(allPermissions);
      if (process.env.NODE_ENV === 'development' && finalPermissions.length > 0) {
        console.log(`✓ Using direct permissions from user document: ${finalPermissions.length} permissions`);
      }
      return finalPermissions;
    }
    
    // BACKWARD COMPATIBILITY: If no permissions array, derive from roles (migration period)
    // This allows old users with roles to continue working
    const roles = user.roles && user.roles.length > 0 
      ? user.roles 
      : (user.role ? [user.role] : []);
    
    if (roles.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠ User ${user.email} has roles but no permissions array. Deriving permissions from roles (backward compatibility mode).`);
      }
      
      // Get permissions from custom roles in Firestore FIRST (priority), then fallback to hardcoded roles
      roles.forEach(roleName => {
        if (!roleName || typeof roleName !== 'string') return; // Skip invalid roles
        
        // Normalize role name for case-insensitive matching
        const normalizedRole = roleName.toLowerCase();
        
        // Generate all possible variations of the role name for flexible matching
        // This ensures we can match roles regardless of case, singular/plural, underscores, spaces, etc.
        const baseVariations = [
          normalizedRole,                          // exact lowercase: 'designers'
          normalizedRole.replace(/_/g, ''),        // no underscores: 'qa_tester' -> 'qatester'
          normalizedRole.replace(/\s+/g, '_'),     // spaces to underscores: 'qa tester' -> 'qa_tester'
          normalizedRole.replace(/\s+/g, ''),      // no spaces: 'qa tester' -> 'qatester'
          normalizedRole.replace(/_/g, ' '),       // underscores to spaces: 'qa_tester' -> 'qa tester'
        ];
        
        // Add singular/plural variations for each base variation
        const roleVariations: string[] = [];
        baseVariations.forEach(base => {
          roleVariations.push(base);
          roleVariations.push(base.replace(/s$/, ''));  // singular: 'designers' -> 'designer'
          if (!base.endsWith('s')) {
            roleVariations.push(base + 's');              // plural: 'designer' -> 'designers' (only if not already plural)
          }
        });
        
        // Add original case variations
        roleVariations.push(roleName);                 // original: 'Designers'
        roleVariations.push(roleName.toLowerCase());   // lowercase: 'designers'
        roleVariations.push(roleName.toUpperCase());   // uppercase: 'DESIGNERS'
        roleVariations.push(roleName.charAt(0).toUpperCase() + normalizedRole.slice(1)); // Capitalized: 'Designers'
        
        // PRIORITY 1: Check custom roles from Firestore FIRST (dynamic, takes precedence)
        let foundCustomRole = false;
        for (const variation of roleVariations) {
          const lowerVariation = variation.toLowerCase();
          
          // Check custom roles map with this variation
          const customRole = customRoles.get(lowerVariation);
          if (customRole && customRole.permissions && Array.isArray(customRole.permissions)) {
            // Found custom role - use ONLY its permissions (don't merge with hardcoded)
            // Validate and filter permissions
            const validPermissions = customRole.permissions
              .filter(perm => typeof perm === 'string' && perm.trim())
              .map(perm => perm.trim());
            
            if (validPermissions.length === 0) {
              console.warn(`⚠ Custom role "${customRole.name}" has no valid permissions`);
              continue; // Skip this role, try next variation
            }
            
            validPermissions.forEach(perm => {
              allPermissions.add(perm);
            });
            foundCustomRole = true;
            
            // Log in development for debugging
            if (process.env.NODE_ENV === 'development') {
              console.log(`✓ Using custom role "${customRole.name}" (matched from user role "${roleName}") with ${validPermissions.length} permissions:`, validPermissions.slice(0, 5).join(', '), validPermissions.length > 5 ? '...' : '');
            }
            break; // Found custom role, skip hardcoded check
          }
          
          // Also try without underscores
          const noUnderscore = lowerVariation.replace(/_/g, '');
          const customRoleNoUnderscore = customRoles.get(noUnderscore);
          if (customRoleNoUnderscore && customRoleNoUnderscore.permissions && Array.isArray(customRoleNoUnderscore.permissions)) {
            // Validate and filter permissions
            const validPermissions = customRoleNoUnderscore.permissions
              .filter(perm => typeof perm === 'string' && perm.trim())
              .map(perm => perm.trim());
            
            if (validPermissions.length === 0) {
              continue; // Skip this role, try next variation
            }
            
            validPermissions.forEach(perm => {
              allPermissions.add(perm);
            });
            foundCustomRole = true;
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`✓ Using custom role "${customRoleNoUnderscore.name}" (no underscore variant, matched from user role "${roleName}") with ${validPermissions.length} permissions:`, validPermissions.slice(0, 5).join(', '), validPermissions.length > 5 ? '...' : '');
            }
            break;
          }
        }
        
        // PRIORITY 2: Only check hardcoded roles if NO custom role was found (fallback)
        if (!foundCustomRole) {
          let foundHardcoded = false;
          for (const variation of roleVariations) {
            const lowerVariation = variation.toLowerCase();
            
            // Check against known role constants (ROLES enum) - find the KEY that matches the VALUE
            const matchingRoleKey = Object.keys(ROLES).find(key => {
              const roleValue = ROLES[key as keyof typeof ROLES];
              return roleValue.toLowerCase() === lowerVariation;
            }) as keyof typeof ROLES | undefined;
            
            if (matchingRoleKey) {
              // Use the role VALUE (like 'qa_tester') to look up in PERMISSIONS_BY_ROLE
              const roleValue = ROLES[matchingRoleKey];
              if (PERMISSIONS_BY_ROLE[roleValue as keyof typeof PERMISSIONS_BY_ROLE]) {
                PERMISSIONS_BY_ROLE[roleValue as keyof typeof PERMISSIONS_BY_ROLE].forEach(perm => allPermissions.add(perm));
                foundHardcoded = true;
                
                if (process.env.NODE_ENV === 'development') {
                  console.log(`✓ Using hardcoded role "${roleValue}" (fallback) with ${PERMISSIONS_BY_ROLE[roleValue as keyof typeof PERMISSIONS_BY_ROLE].length} permissions`);
                }
                break;
              }
            }
            
            // Also check direct key match in PERMISSIONS_BY_ROLE using the variation (handles exact matches)
            if (PERMISSIONS_BY_ROLE[lowerVariation as keyof typeof PERMISSIONS_BY_ROLE]) {
              PERMISSIONS_BY_ROLE[lowerVariation as keyof typeof PERMISSIONS_BY_ROLE].forEach(perm => allPermissions.add(perm));
              foundHardcoded = true;
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`✓ Using hardcoded role "${lowerVariation}" (direct match) with ${PERMISSIONS_BY_ROLE[lowerVariation as keyof typeof PERMISSIONS_BY_ROLE].length} permissions`);
              }
              break;
            }
          }
          
          // If nothing found at all, log warning with detailed debugging info
          if (!foundHardcoded) {
            const availableCustomRoleNames = Array.from(new Set(Array.from(customRoles.values()).map(r => r.name)));
            const availableHardcodedRoles = Object.values(ROLES);
            console.warn(
              `⚠ No role found for "${roleName}". ` +
              `Tried ${roleVariations.length} variations (e.g., ${roleVariations.slice(0, 5).join(', ')}...). ` +
              `Available custom roles in Firestore: ${availableCustomRoleNames.length > 0 ? availableCustomRoleNames.join(', ') : 'none'}. ` +
              `Available hardcoded roles: ${availableHardcodedRoles.join(', ')}`
            );
          }
        }
      });
    }
    
    const finalPermissions = Array.from(allPermissions);
    
    // Enhanced debugging in development mode (async import to avoid blocking)
    if (process.env.NODE_ENV === 'development' && finalPermissions.length > 0) {
      import('@/utils/role-permission-debug').then(({ debugRolePermissions }) => {
        const userRolesList = roles && roles.length > 0 ? roles : (user.role ? [user.role] : []);
        debugRolePermissions(userRolesList, customRoles, finalPermissions);
      }).catch(err => {
        // Silently fail if debug utility can't be loaded
        console.debug('Debug utility not available:', err);
      });
    }
    
    return finalPermissions;
  }, [user, customRoles]);

  const hasPermission = (permission: string) => {
    return userPermissions.includes(permission);
  };

  // Helper to check if user has any of the specified roles
  const hasRole = (roleToCheck: string | string[]) => {
    if (!user) return false;
    const rolesToCheck = Array.isArray(roleToCheck) ? roleToCheck : [roleToCheck];
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    return rolesToCheck.some(role => userRoles.includes(role));
  };

  useEffect(() => {
    if (!firebaseInitialized) {
      setLoading(false);
      return;
    }
    
    if (!auth || !db) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        try {
            if (authUser) {
                const userDocRef = doc(db, 'users', authUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
                    if (userData.disabled) {
                        await signOut(auth);
                        setUser(null);
                    } else {
                        const userWithToken: User = {
                            id: authUser.uid,
                            name: authUser.displayName || userData.name,
                            email: authUser.email!,
                            permissions: userData.permissions || [], // Load permissions from Firestore
                            role: userData.role,
                            roles: userData.roles || (userData.role ? [userData.role] : []), // Support multiple roles
                            photoURL: authUser.photoURL || undefined,
                            expertise: userData.expertise,
                            baseSalary: userData.baseSalary,
                            annualLeaveEntitlement: userData.annualLeaveEntitlement,
                            disabled: userData.disabled,
                            isAdmin: userData.isAdmin,
                            isProjectManager: userData.isProjectManager,
                        };
                        setUser(userWithToken);
                        // Save session to localStorage (only on client side)
                        if (typeof window !== 'undefined') {
                          try {
                            saveSession(userWithToken.id, userWithToken.email, userWithToken.name);
                          } catch (error) {
                            console.warn('Failed to save session:', error);
                          }
                        }
                    }
                } else {
                    console.warn(`User ${authUser.uid} is authenticated but has no Firestore document. Logging out.`);
                    await signOut(auth);
                    setUser(null);
                    if (typeof window !== 'undefined') {
                      try {
                        clearSession();
                      } catch (error) {
                        console.warn('Failed to clear session:', error);
                      }
                    }
                }
            } else {
                setUser(null);
                if (typeof window !== 'undefined') {
                  try {
                    clearSession();
                  } catch (error) {
                    console.warn('Failed to clear session:', error);
                  }
                }
            }
        } catch (error) {
            console.error("Error during authentication state change:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, [firebaseInitialized]);

  useEffect(() => {
    if (!loading && firebaseInitialized) {
      const isAuthPage = pathname === '/';
      const isSignupPage = pathname === '/signup';
      const isInvoicePage = pathname?.startsWith('/invoices/'); // Public invoice viewing
      const isPublicPage = isAuthPage || isSignupPage || isInvoicePage;

      if (user && isPublicPage && !isInvoicePage) {
        // User is authenticated but on a public page (except invoice pages) - redirect to dashboard
        router.push('/dashboard');
        router.refresh();
      } else if (!user && !isPublicPage && pathname !== '/dashboard') {
        // User is not authenticated but trying to access protected route - redirect to login
        router.push('/');
      }
    }
  }, [user, loading, pathname, router, firebaseInitialized]);


  const login = async (email: string, pass: string) => {
    if (!firebaseInitialized) {
      return Promise.reject(new Error("Firebase not initialized. Check your .env file."));
    }
    if (!auth) {
      return Promise.reject(new Error("Firebase Auth not available. Check your configuration."));
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      console.log('Login successful, user:', result.user.email);
      return result;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized. Check your .env file."));
    try {
      await signOut(auth);
      setUser(null);
      // Clear session from localStorage (only on client side)
      if (typeof window !== 'undefined') {
        try {
          clearSession();
        } catch (error) {
          console.warn('Failed to clear session:', error);
        }
      }
      // Redirect to landing page (login page) after logout
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };
  
  const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error("Firebase not initialized. Check your .env file.");
    
    // Use custom branded email instead of Firebase default
    try {
      const { sendCustomPasswordResetEmail } = await import('@/app/actions/user-actions');
      const result = await sendCustomPasswordResetEmail(email);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send password reset email');
      }
    } catch (error: any) {
      // Fallback to Firebase default if custom email fails
      console.warn('Custom password reset email failed, falling back to Firebase default:', error);
      await sendPasswordResetEmail(auth, email);
    }
  }

  const value = { user, login, logout, loading, rolesLoading, sendPasswordReset, hasPermission, hasRole, customRoles };

  if (!firebaseInitialized) {
    return <MissingFirebaseConfig />;
  }

  // Only show skeleton on dashboard routes, not on login/signup/invoice pages
  const isPublicPage = pathname === '/' || pathname === '/signup' || pathname?.startsWith('/invoices/');
  
  // Wait for both auth loading AND roles loading to complete before showing dashboard
  // This ensures permissions are fully loaded before user sees the dashboard
  // We check both loading states and also ensure userPermissions is calculated (has at least profile:read)
  // However, don't block on public pages - allow redirect to happen
  const permissionsReady = user ? userPermissions.length > 0 : true;
  // Only show skeleton if:
  // 1. Not on a public page (login/signup)
  // 2. Auth is still loading OR roles are loading AND we have a user (meaning we're authenticated)
  // 3. Permissions aren't ready AND we have a user
  // Don't block if we're on a public page - allow redirect to work
  const shouldShowSkeleton = !isPublicPage && user && (loading || rolesLoading || !permissionsReady);
  
  if (shouldShowSkeleton) {
    return <FullPageSkeleton />;
  }

  return (
    <AuthContext.Provider value={value}>
      <FirebaseErrorListener />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
