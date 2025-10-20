
import { useAuth } from "@/providers/auth-provider";

export function usePermissions() {
    const { hasPermission } = useAuth();
    return { hasPermission };
}
