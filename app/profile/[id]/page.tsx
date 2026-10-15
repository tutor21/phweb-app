import { Suspense } from 'react';
import UserProfileClient from './UserProfileClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

function ProfileLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-neutral-500">
        Loading profile...
      </p>
    </div>
  );
}

async function ProfileContent({ params }: PageProps) {
  const { id } = await params;

  return <UserProfileClient userId={id} />;
}

export default function UserProfilePage({ params }: PageProps) {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}