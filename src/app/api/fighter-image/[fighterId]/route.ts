import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'mmaapi.p.rapidapi.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fighterId: string }> }
) {
  const { fighterId } = await params;

  if (!RAPIDAPI_KEY) {
    return new NextResponse('API key not configured', { status: 500 });
  }

  try {
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/mma/team/${fighterId}/image`,
      {
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
        // Cache por 7 dias
        next: { revalidate: 604800 },
      }
    );

    if (!response.ok) {
      // Retornar imagem placeholder ou 404
      return new NextResponse(null, { status: 404 });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, immutable', // 7 dias
      },
    });
  } catch (error) {
    console.error('Error fetching fighter image:', error);
    return new NextResponse(null, { status: 500 });
  }
}






