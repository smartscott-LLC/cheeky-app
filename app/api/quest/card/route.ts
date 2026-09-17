import { NextResponse } from 'next/server';
import { getManifest, QuestManifest } from '@/utils/quest-storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    // Load manifest
    const manifest = await getManifest(userId);

    // Build card data
    const cardData = buildCardData(manifest);

    return NextResponse.json({ cardData });
  } catch (error) {
    console.error('Fetch card error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch card',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

function buildCardData(manifest: QuestManifest) {
  return {
    userId: manifest.userId,
    name: manifest.name,
    bio: manifest.bio,
    gender: manifest.gender,
    age: manifest.age,
    height: manifest.height,
    hometown: manifest.hometown,
    state: manifest.state,
    rpgClass: manifest.avatarMeta?.rpgClass,
    membershipLevel: undefined as any, // TODO: fetch from subscriptions table
    avatarImageUrl: manifest.avatarImage?.url,
    showCard: manifest.avatarImage?.url ? true : false
  };
}
