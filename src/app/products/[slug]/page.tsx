export const dynamic = "force-dynamic";
import { getProductBySlug } from "../../../lib/products";
import ProductDetail from "./ProductDetail";

type Props = { params: { slug: string } };

export default async function ProductDetailPage({ params }: Props) {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    return <div className="text-slate-300">Product not found.</div>;
  }
  return <ProductDetail product={product} />;
}