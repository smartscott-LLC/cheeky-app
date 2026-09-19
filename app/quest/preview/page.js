import AssetPreview from '@/components/AssetPreview';
import { ASSET_CATALOG } from '@/utils/asset-catalog';

export const metadata = { title: 'Quest Asset Preview' };

export default function Page() {
  return <AssetPreview catalog={ASSET_CATALOG} />;
}
