/**
 * User helper utilities
 * Functions for formatting and handling user-related data
 */

/**
 * Get user initials from full name or email
 * @param fullName - User's full name
 * @param email - User's email (fallback)
 * @returns Initials (max 2 characters)
 */
export const getUserInitials = (fullName: string | null, email: string): string => {
  if (fullName && fullName.trim()) {
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      // First and last name initials
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    // Single name, take first two characters or just first character
    return fullName.substring(0, 2).toUpperCase();
  }

  // Fallback to email first character
  return email[0].toUpperCase();
};

/**
 * Get user display name
 * @param fullName - User's full name
 * @param email - User's email (fallback)
 * @returns Display name
 */
export const getUserDisplayName = (fullName: string | null, email: string): string => {
  if (fullName && fullName.trim()) {
    return fullName;
  }
  // Return email username part
  return email.split("@")[0];
};
