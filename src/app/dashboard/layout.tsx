import { Sidebar } from '@/components/common/sidebar';
import { useAuth } from '@/providers/auth-provider';
import { redirect } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
