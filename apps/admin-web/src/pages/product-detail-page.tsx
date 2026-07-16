import { useParams } from 'react-router-dom';
import { ProductDetailPage as DetailPage } from '@features/products/components/product-detail-page';

export function ProductDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-headline-md font-semibold text-on-surface">Invalid product ID</h2>
      </div>
    );
  }

  return <DetailPage productId={id} />;
}
