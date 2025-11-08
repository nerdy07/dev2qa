'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Award, Target, CheckCircle } from 'lucide-react';
import type { Achievement } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const achievementIcons = {
  top_qa_tester: Trophy,
  top_requester: Star,
  first_approval: CheckCircle,
  milestone_10: Award,
  milestone_50: Award,
  milestone_100: Target,
};

const achievementColors = {
  top_qa_tester: 'bg-yellow-500',
  top_requester: 'bg-blue-500',
  first_approval: 'bg-green-500',
  milestone_10: 'bg-purple-500',
  milestone_50: 'bg-indigo-500',
  milestone_100: 'bg-red-500',
};

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
}

export function AchievementBadge({ achievement, size = 'md' }: AchievementBadgeProps) {
  const Icon = achievementIcons[achievement.type] || Trophy;
  const colorClass = achievementColors[achievement.type] || 'bg-gray-500';

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn(
          'rounded-full flex items-center justify-center text-white',
          colorClass,
          sizeClasses[size]
        )}>
          <Icon className={cn(
            size === 'sm' && 'h-6 w-6',
            size === 'md' && 'h-8 w-8',
            size === 'lg' && 'h-12 w-12'
          )} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{achievement.title}</h3>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
          {achievement.earnedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Earned {format(achievement.earnedAt.toDate(), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

