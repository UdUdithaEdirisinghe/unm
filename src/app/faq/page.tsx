import FaqClient from "./FaqClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "FAQs • Manny.lk",
  description:
    "Common questions about ordering, shipping, payments, returns, warranty and support at Manny.lk.",
};

export default function FaqPage() {
  return <FaqClient />;
}