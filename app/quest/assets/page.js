import AssetBrowser from '@/components/AssetBrowser';
import { ASSET_CATALOG } from '@/utils/asset-catalog';

export const metadata = { title: 'Quest Assets — Asset Browser' };

export default function AssetBrowserPage() {
  return <AssetBrowser initialCatalog={ASSET_CATALOG} />;
}
