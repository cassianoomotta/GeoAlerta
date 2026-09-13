const { Client } = require('./node_modules/pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Geoalertasap@db.leljlonneasozzcwhntj.supabase.co:5432/postgres'
});

const USER_ID = 'a7ceb4a0-697e-4f64-b028-f0384fc7374c';
const EMAIL = 'admin@prefeitura.gov.br';

async function fixUser() {
  await client.connect();
  console.log('Conectado.');

  try {
    // Verificar identidades existentes
    const identity = await client.query(
      "SELECT id FROM auth.identities WHERE user_id = '" + USER_ID + "'"
    );
    console.log('Identidades encontradas:', identity.rows.length);

    if (identity.rows.length === 0) {
      // Criar identidade (necessaria para login por email/senha no Supabase)
      await client.query(
        "INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES (gen_random_uuid(), '" + USER_ID + "', '{\"sub\": \"" + USER_ID + "\", \"email\": \"" + EMAIL + "\"}'::jsonb, 'email', NOW(), NOW(), NOW())"
      );
      console.log('Identidade criada!');
    } else {
      console.log('Identidade ja existe.');
    }

    // Garantir senha correta e email confirmado
    await client.query(
      "UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()), encrypted_password = crypt('123456', gen_salt('bf')), updated_at = NOW() WHERE id = '" + USER_ID + "'"
    );
    console.log('Senha e email atualizados!');

    console.log('\nPronto! Login:');
    console.log('Email: ' + EMAIL);
    console.log('Senha: 123456');

  } catch(e) {
    console.error('Erro:', e.message);
  } finally {
    await client.end();
  }
}

fixUser();
