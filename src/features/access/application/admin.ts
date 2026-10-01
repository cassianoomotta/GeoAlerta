import type { CreateManagedUser } from '../domain/admin';

export type ProvisioningResult = { userId: string; state: 'PENDENTE'; provisioningLink: string; retried: boolean };

export async function provisionPendingUser(
  user: CreateManagedUser,
  ports: {
    ensureAuthUser(email: string, name: string): Promise<{ userId: string; existed: boolean }>;
    savePending(userId: string, user: CreateManagedUser, retried: boolean): Promise<void>;
    createLink(email: string): Promise<string>;
  },
): Promise<ProvisioningResult> {
  const authUser = await ports.ensureAuthUser(user.email, user.name);
  await ports.savePending(authUser.userId, user, authUser.existed);
  const provisioningLink = await ports.createLink(user.email);
  return { userId: authUser.userId, state: 'PENDENTE', provisioningLink, retried: authUser.existed };
}
