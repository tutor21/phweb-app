
type ModerationResult = {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
};

type ModerationResponse = {
  results?: ModerationResult[];
};

export type ImageScanResult = {
  status: 'approved' | 'rejected' | 'review';
  message: string;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

// Categories that Socials does not allow in uploaded photos.
const BLOCKED_CATEGORIES = [
  'sexual',
  'sexual/minors',
  'violence',
  'violence/graphic',
  'self-harm',
  'self-harm/intent',
  'self-harm/instructions',
  'harassment/threatening',
  'hate/threatening',
  'illicit/violent',
];

// Additional caution for images that may contain
// sexual content even if the category is not flagged.
const SEXUAL_REVIEW_THRESHOLD = 0.3;

export async function scanImage(
  image: Buffer,
  mimeType: string
): Promise<ImageScanResult> {
  // 1. Validate image format.
  if (!SUPPORTED_TYPES.includes(mimeType)) {
    throw new Error('Unsupported image format.');
  }

  // 2. Validate image size.
  if (image.length === 0) {
    throw new Error('Image is empty.');
  }

  if (image.length > MAX_IMAGE_SIZE) {
    throw new Error('Image exceeds the 5 MB limit.');
  }

  // 3. Require OpenAI moderation.
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Image moderation is not configured.'
    );
  }

  // 4. Convert image to a Base64 data URL.
  const dataUrl =
    `data:${mimeType};base64,${image.toString('base64')}`;

  // 5. Submit the actual photo to OpenAI.
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
            image_url: {
              url: dataUrl,
            },
          },
        ],
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    }
  );

  // 6. Fail closed if moderation is unavailable.
  if (!response.ok) {
    console.error(
      'OpenAI moderation request failed:',
      response.status
    );

    throw new Error(
      'Image moderation is unavailable. Please try again.'
    );
  }

  // 7. Read moderation results.
  const data =
    (await response.json()) as ModerationResponse;

  const result = data.results?.[0];

  if (
    !result ||
    !result.categories ||
    !result.category_scores
  ) {
    throw new Error(
      'Image moderation returned an invalid result.'
    );
  }

  // 8. Reject photos matching prohibited categories.
  const blockedCategory = BLOCKED_CATEGORIES.find(
    (category) => result.categories[category] === true
  );

  if (blockedCategory) {
    console.warn(
      '[Socials Moderation] Image rejected:',
      blockedCategory
    );

    return {
      status: 'rejected',
      message:
        'This photo cannot be published because it may contain prohibited content.',
    };
  }

  // 9. Hold borderline sexual content for review.
  const sexualScore =
    result.category_scores['sexual'] ?? 0;

  if (sexualScore >= SEXUAL_REVIEW_THRESHOLD) {
    console.warn(
      '[Socials Moderation] Image requires review.'
    );

    return {
      status: 'review',
      message:
        'This photo requires additional review before publication.',
    };
  }

  // 10. Fail closed for other categories flagged
  // by the moderation model.
  if (result.flagged === true) {
    console.warn(
      '[Socials Moderation] Image flagged by OpenAI.'
    );

    return {
      status: 'review',
      message:
        'This photo requires additional review before publication.',
    };
  }

  // 11. Approve the photo.
  return {
    status: 'approved',
    message: 'Image approved for publication.',
  };
}
