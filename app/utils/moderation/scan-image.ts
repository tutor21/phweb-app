
type ModerationResult = {
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
};

export type ImageScanResult = {
  status: 'approved' | 'rejected' | 'review';
  message: string;
};

export async function scanImage(
  image: Buffer,
  mimeType: string
): Promise<ImageScanResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Image moderation is not configured.');
  }

  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (!supportedTypes.includes(mimeType)) {
    throw new Error('Unsupported image format.');
  }

  if (image.length > 5 * 1024 * 1024) {
    throw new Error('Image exceeds the 5 MB limit.');
  }

  const dataUrl =
    `data:${mimeType};base64,${image.toString('base64')}`;

  const response = await fetch(
    'https://api.openai.com/v1/moderations',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
        ],
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    }
  );

  if (!response.ok) {
    throw new Error(
      'Image moderation is unavailable. Please try again.'
    );
  }

  const result = (
    (await response.json()) as {
      results?: ModerationResult[];
    }
  ).results?.[0];

  if (!result) {
    throw new Error('Image moderation returned no result.');
  }

  const sexual = result.categories['sexual'] === true;
  const sexualMinors =
    result.categories['sexual/minors'] === true;

  if (sexual || sexualMinors) {
    return {
      status: 'rejected',
      message:
        'This photo cannot be published because it may contain prohibited sexual or explicit content.',
    };
  }

  const sexualScore =
    result.category_scores['sexual'] ?? 0;

  if (sexualScore >= 0.3) {
    return {
      status: 'review',
      message:
        'This photo requires additional review before publication.',
    };
  }

  return {
    status: 'approved',
    message: 'Image approved for publication.',
  };
}
