import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
const PREVIEW_DIR = path.join(process.cwd(), 'public', 'pictures', 'previews');

// Map category names to preview image filenames
const CATEGORY_PREVIEWS: Record<string, string> = {
  'accessories1': 'accessories1.jpeg',
  'accessories2': 'accessories2.jpeg',
  'accessories3': 'accessories3.jpg',
  'accessory4': 'accessories4.jpg',
  'athletic_female': 'athletic_female.jpeg',
  'athletic_male': 'athletic.jpeg',
  'average_female': 'average_female.jpeg',
  'average_male': 'average.jpeg',
  'big_boned_male': 'big-boned.jpeg',
  'bodies': 'female_bodies6.jpg',
  'curvy_female': 'curvy_female.jpeg',
  'female_body_and _tops': 'female_body_and_tops.jpg',
  'female_bottoms1': 'female_bottoms1.jpeg',
  'female_bottoms2': 'female_bottoms2.jpg',
  'female_bottoms3': 'female_bottoms3.jpg',
  'female_eyes1': 'female_eyes1.jpg',
  'female_eyes2': 'female_eyes2.jpg',
  'female_eyes3': 'female_eyes3.jpeg',
  'female_eyes4': 'female_eyes4.jpg',
  'female_models01': 'female_models1.jpg',
  'female_models02': 'female_models.jpeg',
  'female_models03': 'female_models3.jpg',
  'female_models2': 'female_models2.jpg',
  'female_models3': 'female_models3.jpg',
  'female_models4': 'female_models4.jpg',
  'female_shirt_and_shoe_combos': 'female_shirts_and_shoe_combos.jpg',
  'female_shoes1': 'female_shoes1.jpeg',
  'female_shoes2': 'female_shoes2.jpg',
  'female_shoes3': 'female_shoes3.jpg',
  'female_tops': 'female_tops.jpeg',
  'fit_female': 'fit_female.jpeg',
  'hair_female1': 'hair_female1.jpeg',
  'hair_female2': 'hair_female2.jpeg',
  'hair_female3': 'hair_female3.jpeg',
  'hair_female4': 'hair_female4.jpeg',
  'hair_female5': 'hair_female5.jpeg',
  'hair_male1': 'hair_male1.jpg',
  'hair_male2': 'hair_male2.jpg',
  'hair_male3': 'hair_male3.jpg',
  'male_bodies1': 'male_bodies2.jpg',
  'male_bottoms1': 'male_bottoms1.jpg',
  'male_bottoms2': 'male_bottoms2.jpg',
  'male_bottoms3': 'male_bottoms3.jpeg',
  'male_eyes1': 'male_eyes1.jpeg',
  'male_eyes2': 'male_eyes2.jpg',
  'male_eyes3': 'male_eyes3.jpg',
  'male_faces1': 'men_avatar_image.jpeg',
  'male_models01': 'male_models1.jpeg',
  'male_models02': 'male_models.jpeg',
  'male_models03': 'male_models3.jpg',
  'male_models04': 'malemodels4.jpg',
  'male_shoes1': 'male_shoes1.jpeg',
  'male_shoes2': 'male_shoes2.jpg',
  'male_shoes3': 'male_shoes3.jpg',
  'male_tops1': 'male_tops1.jpeg',
  'male_tops2': 'male_tops2.jpg',
  'male_tops_and_bodies': 'male_bodies_and_tops.jpg',
  'mixed_models01': 'mix_models.jpeg',
  'muscular_male': 'muscular.jpeg',
  'plus_size_female': 'plus_size_female.jpeg',
  'plus_sized_male': 'plus-sized.jpeg',
  'slim_female': 'slim_female.jpeg',
  'slim_male': 'slim.jpeg',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('cat');

  if (!category || !CATEGORY_PREVIEWS[category]) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const filename = CATEGORY_PREVIEWS[category];
  const ext = filename.split('.').pop() || 'jpeg';
  const filePath = path.join(PREVIEW_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const contentType = `image/${ext}`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
