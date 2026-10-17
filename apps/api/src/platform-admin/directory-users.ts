/** Directory display rule only; this never grants or denies account access. */
export function isBusinessDirectoryUser(user: { role?: string | null }): boolean {
  return user.role !== 'PLATFORM_SUPER_ADMIN' && user.role !== 'PLATFORM_FOUNDER';
}