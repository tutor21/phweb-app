
import EditPostClient from './EditPostClient';

// Next.js 16 Cache Components:
// Render this dynamic route on request instead of
// requiring it to be fully prerendered at build time.
export const instant = false;

interface EditPostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPostPage({
  params,
}: EditPostPageProps) {
  const { id } = await params;

  return <EditPostClient postId={id} />;
}
