import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class AdminAuthConfigurationError extends Error {
  constructor() { super('ADMIN_AUTH_NOT_CONFIGURED'); }
}

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AdminAuthConfigurationError();
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
}

async function findUserByEmail(email: string) {
  const auth = client();
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await auth.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error('ADMIN_AUTH_LOOKUP_FAILED');
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return { id: match.id, existed: true };
    if (data.users.length < 100) break;
  }
  return { id: null, existed: false };
}

export async function ensureAuthUser(email: string, name: string) {
  const auth = client();
  const found = await findUserByEmail(email);
  if (found.id) return { userId: found.id, existed: true };
  const { data, error } = await auth.auth.admin.createUser({ email, email_confirm: false, user_metadata: { name } });
  if (error || !data.user) throw new Error('ADMIN_AUTH_PROVISION_FAILED');
  return { userId: data.user.id, existed: false };
}

export async function createProvisioningLink(email: string) {
  const { data, error } = await client().auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data.properties?.action_link) throw new Error('ADMIN_AUTH_LINK_FAILED');
  return data.properties.action_link;
}
