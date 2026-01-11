/**
 * Comment Mentions Utility Functions
 * Feature 5: Enhanced Commenting with @Mentions
 * 
 * Provides functions to parse @mentions from comment text and notify mentioned users.
 */

import type { CommentMention, User } from './types';

/**
 * Parses @mentions from comment text
 * @param text - The comment text
 * @param users - Array of all users to match against
 * @returns Array of mention objects with user info and text positions
 */
export function parseMentions(text: string, users: User[]): CommentMention[] {
  const mentions: CommentMention[] = [];
  
  // Pattern to match @username or @email
  const mentionPattern = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)|@([a-zA-Z0-9._-]+)/g;
  
  let match;
  while ((match = mentionPattern.exec(text)) !== null) {
    const fullMatch = match[0]; // e.g., "@john.doe@example.com" or "@john.doe"
    const emailMatch = match[1]; // Email if matched
    const usernameMatch = match[2]; // Username if matched
    
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;
    
    // Try to find matching user
    let matchedUser: User | undefined;
    
    if (emailMatch) {
      // Match by email
      matchedUser = users.find(user => 
        user.email.toLowerCase() === emailMatch.toLowerCase()
      );
    } else if (usernameMatch) {
      // Match by name (case-insensitive, partial match)
      const searchTerm = usernameMatch.toLowerCase();
      matchedUser = users.find(user => {
        const nameLower = user.name.toLowerCase();
        const emailLower = user.email.toLowerCase();
        
        // Check if name starts with the search term or contains it as a word
        return nameLower.includes(searchTerm) || 
               emailLower.split('@')[0].toLowerCase().includes(searchTerm);
      });
    }
    
    if (matchedUser) {
      mentions.push({
        userId: matchedUser.id,
        userName: matchedUser.name,
        userEmail: matchedUser.email,
        startIndex,
        endIndex,
      });
    }
  }
  
  // Remove duplicate mentions (same user mentioned multiple times)
  const uniqueMentions = mentions.reduce((acc, mention) => {
    const existing = acc.find(m => m.userId === mention.userId);
    if (!existing) {
      acc.push(mention);
    }
    return acc;
  }, [] as CommentMention[]);
  
  return uniqueMentions;
}

/**
 * Renders comment text with highlighted mentions
 * @param text - The comment text
 * @param mentions - Array of mention objects
 * @returns HTML string with mentions wrapped in spans
 */
export function renderMentions(text: string, mentions: CommentMention[]): string {
  if (!mentions || mentions.length === 0) {
    return text;
  }
  
  // Sort mentions by startIndex in reverse order to preserve indices when replacing
  const sortedMentions = [...mentions].sort((a, b) => b.startIndex - a.startIndex);
  
  let result = text;
  
  for (const mention of sortedMentions) {
    const before = result.substring(0, mention.startIndex);
    const mentionText = result.substring(mention.startIndex, mention.endIndex);
    const after = result.substring(mention.endIndex);
    
    result = `${before}<span class="mention" data-user-id="${mention.userId}" data-user-name="${mention.userName}">${mentionText}</span>${after}`;
  }
  
  return result;
}

/**
 * Extracts mentioned user IDs from comment text
 * @param text - The comment text
 * @param users - Array of all users to match against
 * @returns Array of user IDs that were mentioned
 */
export function getMentionedUserIds(text: string, users: User[]): string[] {
  const mentions = parseMentions(text, users);
  return mentions.map(m => m.userId);
}

/**
 * Extracts mentioned user emails from comment text
 * @param text - The comment text
 * @param users - Array of all users to match against
 * @returns Array of user emails that were mentioned
 */
export function getMentionedUserEmails(text: string, users: User[]): string[] {
  const mentions = parseMentions(text, users);
  return mentions.map(m => m.userEmail);
}
