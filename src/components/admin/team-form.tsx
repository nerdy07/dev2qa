'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Team } from '@/lib/types';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/use-collection';
import { User } from '@/lib/types';

const teamFormSchema = z.object({
  name: z.string().min(2, {
    message: "Team name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  department: z.string().optional(),
  teamLeadId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

interface TeamFormProps {
  team?: Team;
  onSuccess?: () => void;
}

export function TeamForm({ team, onSuccess }: TeamFormProps) {
  const { toast } = useToast();
  const { data: users } = useCollection<User>('users');
  
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: team?.name || '',
      description: team?.description || '',
      department: team?.department || '',
      teamLeadId: team?.teamLeadId || '',
      status: team?.status || 'active',
    },
  });

  const onSubmit = async (values: TeamFormValues) => {
    try {
      if (team) {
        // Update existing team
        await updateDoc(doc(db!, 'teams', team.id), {
          ...values,
          updatedAt: new Date().toISOString(),
        });
        toast({
          title: "Team updated",
          description: `Team "${values.name}" has been updated successfully.`,
        });
      } else {
        // Create new team
        await addDoc(collection(db!, 'teams'), {
          ...values,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast({
          title: "Team created",
          description: `Team "${values.name}" has been created successfully.`,
        });
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Error saving team:', error);
      toast({
        title: "Error",
        description: "Failed to save team. Please try again.",
        variant: "destructive",
      });
    }
  };

  const potentialTeamLeads = users?.filter(user => 
    ['admin', 'manager', 'senior_qa', 'project_manager'].includes(user.role)
  ) || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter team name" {...field} />
              </FormControl>
              <FormDescription>
                This is the public display name for the team.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter team description"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief description of the team's purpose and responsibilities.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="qa">Quality Assurance</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The department this team belongs to.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="teamLeadId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Lead</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team lead" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {potentialTeamLeads.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select a team lead for this team.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The current status of the team.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : team ? 'Update Team' : 'Create Team'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
