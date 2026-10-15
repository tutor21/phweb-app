import { Suspense } from 'react';
import ChatClient from './ChatClient';

type Props = { params: Promise<{ id: string }> };

export default function ConversationPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Loading conversation...</div>}>
      <ConversationContent params={params} />
    </Suspense>
  );
}

async function ConversationContent({ params }: Props) {
  const { id } = await params;
  return <ChatClient conversationId={id} />;
}
