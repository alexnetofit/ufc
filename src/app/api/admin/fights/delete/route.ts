import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar se o usuário atual é admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!currentProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fightId } = await request.json();

    if (!fightId) {
      return NextResponse.json({ error: 'fightId is required' }, { status: 400 });
    }

    // Delete cascades para picks
    const { error } = await supabase
      .from('fights')
      .delete()
      .eq('id', fightId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete fight error:', error);
    return NextResponse.json({ error: 'Failed to delete fight' }, { status: 500 });
  }
}

