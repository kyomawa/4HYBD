/**
 * Format a date relative to the current time (e.g., "5 minutes ago", "Yesterday", etc.)
 * @param timestamp Timestamp in milliseconds
 * @returns Formatted string
 */
export const formatRelativeTime = (timestamp: number): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
    if (diffDays === 0) {
      // Today
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        
        if (diffMinutes === 0) {
          return "Just now";
        }
        
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
      }
  
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    }
  
    if (diffDays === 1) {
      return "Yesterday";
    }
  
    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    }
  
    return date.toLocaleDateString();
  };
  
  /**
   * Format a time (e.g., "3:45 PM")
   * @param timestamp Timestamp in milliseconds
   * @returns Formatted time string
   */
  export const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  
  /**
   * Format a date (e.g., "Jan 15, 2023")
   * @param timestamp Timestamp in milliseconds
   * @returns Formatted date string
   */
  export const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  
  /**
   * Format a date as "Today", "Yesterday", or the actual date
   * @param timestamp Timestamp in milliseconds
   * @returns Formatted date string
   */
  export const formatDateLabel = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
  
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return "Today";
    }
  
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return "Yesterday";
    }
  
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: today.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
    });
  };
  
  /**
   * Calculate time remaining until a timestamp
   * @param timestamp Timestamp in milliseconds
   * @returns Object with hours, minutes, and seconds remaining
   */
  export const getTimeRemaining = (timestamp: number): { hours: number; minutes: number; seconds: number } => {
    const total = Math.max(0, timestamp - Date.now());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    
    return {
      hours,
      minutes,
      seconds,
    };
  };
  
  /**
   * Format a duration in hours:minutes:seconds format
   * @param seconds Total duration in seconds
   * @returns Formatted duration string
   */
  export const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  /**
   * Check if a timestamp has expired
   * @param timestamp Timestamp in milliseconds
   * @returns Boolean indicating if the timestamp has expired
   */
  export const hasExpired = (timestamp: number): boolean => {
    return Date.now() > timestamp;
  };