import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'mmaapi.p.rapidapi.com';

// Cache de imagens em memória para evitar múltiplas chamadas
const imageCache = new Map<number, { data: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fighterId: string }> }
) {
  try {
    const { fighterId } = await params;
    const id = parseInt(fighterId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid fighter ID' }, { status: 400 });
    }

    // Verificar cache
    const cached = imageCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new NextResponse(cached.data, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=86400', // 24 horas
        },
      });
    }

    if (!RAPIDAPI_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Buscar imagem da API
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/mma/team/${id}/image`,
      {
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      // Retornar placeholder se não encontrar
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const imageData = await response.arrayBuffer();

    // Salvar no cache
    imageCache.set(id, {
      data: imageData,
      contentType,
      timestamp: Date.now(),
    });

    // Limpar cache antigo (manter apenas últimos 500 lutadores)
    if (imageCache.size > 500) {
      const oldestKey = imageCache.keys().next().value;
      if (oldestKey) imageCache.delete(oldestKey);
    }

    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24 horas
      },
    });
  } catch (error) {
    console.error('Error fetching fighter image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

