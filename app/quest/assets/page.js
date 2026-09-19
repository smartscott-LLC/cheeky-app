import AssetBrowser from '@/components/AssetBrowser';
import fs from 'fs';
import path from 'path';

const CATALOG_PATH = path.join(process.cwd(), 'public', 'asset-catalog.json');
let catalog = {};
if (fs.existsSync(CATALOG_PATH)) {
  catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}

export const metadata = { title: 'Quest Assets — Asset Browser' };

export default function AssetBrowserPage() {
  return <AssetBrowser initialCatalog={catalog} />;
}
