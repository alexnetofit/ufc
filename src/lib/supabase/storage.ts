import { SupabaseClient } from '@supabase/supabase-js';

const FIGHTERS_BUCKET = 'fighters';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'mmaapi.p.rapidapi.com';

/**
 * Baixa a foto de um lutador da API externa
 */
export async function downloadFighterImage(fighterId: number): Promise<ArrayBuffer | null> {
  if (!RAPIDAPI_KEY) {
    console.error('[Storage] RAPIDAPI_KEY não configurada');
    return null;
  }

  try {
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/mma/team/${fighterId}/image`,
      {
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      console.log(`[Storage] Foto não encontrada para fighter ${fighterId}`);
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error(`[Storage] Erro ao baixar foto do fighter ${fighterId}:`, error);
    return null;
  }
}

/**
 * Faz upload da foto de um lutador para o Supabase Storage
 * Se já existir, sobrescreve
 */
export async function uploadFighterImage(
  supabase: SupabaseClient,
  fighterId: number,
  imageData: ArrayBuffer
): Promise<string | null> {
  const filePath = `${fighterId}.png`;

  try {
    const { error } = await supabase.storage
      .from(FIGHTERS_BUCKET)
      .upload(filePath, imageData, {
        contentType: 'image/png',
        upsert: true, // Sobrescreve se já existir
      });

    if (error) {
      console.error(`[Storage] Erro ao fazer upload da foto ${fighterId}:`, error);
      return null;
    }

    // Retornar URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(FIGHTERS_BUCKET)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error(`[Storage] Erro no upload do fighter ${fighterId}:`, error);
    return null;
  }
}

/**
 * Deleta a foto de um lutador do Storage
 */
export async function deleteFighterImage(
  supabase: SupabaseClient,
  fighterId: number
): Promise<boolean> {
  const filePath = `${fighterId}.png`;

  try {
    const { error } = await supabase.storage
      .from(FIGHTERS_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error(`[Storage] Erro ao deletar foto ${fighterId}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[Storage] Erro ao deletar fighter ${fighterId}:`, error);
    return false;
  }
}

/**
 * Baixa e salva a foto de um lutador
 * Retorna a URL pública ou null se falhar
 */
export async function syncFighterImage(
  supabase: SupabaseClient,
  fighterId: number,
  fighterName: string
): Promise<string | null> {
  // 1. Verificar se fighter já existe no banco
  const { data: existingFighter } = await supabase
    .from('fighters')
    .select('id, image_url')
    .eq('api_id', fighterId)
    .single();

  if (existingFighter) {
    // Atualizar updated_at para indicar que ainda está ativo
    await supabase
      .from('fighters')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existingFighter.id);

    return existingFighter.image_url;
  }

  // 2. Baixar foto da API
  const imageData = await downloadFighterImage(fighterId);
  
  if (!imageData) {
    // Criar registro sem foto
    await supabase
      .from('fighters')
      .upsert({
        api_id: fighterId,
        name: fighterName,
        image_url: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'api_id' });

    return null;
  }

  // 3. Upload para o Storage
  const imageUrl = await uploadFighterImage(supabase, fighterId, imageData);

  // 4. Salvar no banco
  await supabase
    .from('fighters')
    .upsert({
      api_id: fighterId,
      name: fighterName,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'api_id' });

  return imageUrl;
}

/**
 * Retorna a URL da foto de um lutador do banco
 */
export async function getFighterImageUrl(
  supabase: SupabaseClient,
  fighterId: number
): Promise<string | null> {
  const { data } = await supabase
    .from('fighters')
    .select('image_url')
    .eq('api_id', fighterId)
    .single();

  return data?.image_url || null;
}


