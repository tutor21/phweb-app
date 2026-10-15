
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scanImage } from '@/app/utils/moderation/scan-image';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 500;

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isValidImageSignature(
  buffer: Buffer,
  mimeType: string
): boolean {
  if (mimeType === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mimeType === 'image/png') {
    const pngSignature = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);

    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(pngSignature)
    );
  }

  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  return false;
}

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const openaiApiKey =
    process.env.OPENAI_API_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceKey
  ) {
    console.error(
      'Missing Supabase environment variables.'
    );

    return errorResponse(
      'Publishing service is not configured.',
      503
    );
  }

  const authorization =
    request.headers.get('authorization');

  if (
    !authorization ||
    !authorization.startsWith('Bearer ')
  ) {
    return errorResponse(
      'Please log in to publish a post.',
      401
    );
  }

  const accessToken = authorization
    .slice(7)
    .trim();

  if (!accessToken) {
    return errorResponse(
      'Invalid authentication token.',
      401
    );
  }

  // Authenticate the requesting user using their
  // Supabase access token, not a user ID from the browser.
  const authClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(
    accessToken
  );

  if (authError || !user) {
    return errorResponse(
      'Your session has expired. Please log in again.',
      401
    );
  }

  // Service-role client must remain on the server.
  // Never expose this key in client-side code.
  const admin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  let uploadedFilePath: string | null = null;

  try {
    // Reject obviously oversized requests early.
    // A hosting-level body limit is still recommended.
    const contentLength = Number(
      request.headers.get('content-length') ?? 0
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength >
        MAX_IMAGE_SIZE + 1024 * 1024
    ) {
      return errorResponse(
        'Upload request exceeds the size limit.',
        413
      );
    }

    const formData = await request.formData();

    const captionValue =
      formData.get('caption');

    if (
      captionValue !== null &&
      typeof captionValue !== 'string'
    ) {
      return errorResponse(
        'Invalid post caption.',
        400
      );
    }

    const caption =
      typeof captionValue === 'string'
        ? captionValue.trim()
        : '';

    if (caption.length > MAX_CAPTION_LENGTH) {
      return errorResponse(
        'Post caption cannot exceed 500 characters.',
        400
      );
    }

    const imageValue =
      formData.get('image');

    if (
      imageValue !== null &&
      !(imageValue instanceof File)
    ) {
      return errorResponse(
        'Invalid image attachment.',
        400
      );
    }

    const imageFile =
      imageValue instanceof File
        ? imageValue
        : null;

    if (!caption && !imageFile) {
      return errorResponse(
        'Please write something or add a photo.',
        400
      );
    }

    let imageUrl: string | null = null;

    // Only images need AI moderation.
    // Text-only posts can publish without an image scan.
    if (imageFile) {
      if (!openaiApiKey) {
        return errorResponse(
          'Image moderation is not configured.',
          503
        );
      }

      const extension =
        IMAGE_TYPES[imageFile.type];

      if (!extension) {
        return errorResponse(
          'Only JPEG, PNG, and WebP images are supported.',
          400
        );
      }

      if (
        imageFile.size === 0 ||
        imageFile.size > MAX_IMAGE_SIZE
      ) {
        return errorResponse(
          'Image must be smaller than 5 MB.',
          400
        );
      }

      const imageBuffer = Buffer.from(
        await imageFile.arrayBuffer()
      );

      if (
        !isValidImageSignature(
          imageBuffer,
          imageFile.type
        )
      ) {
        return errorResponse(
          'The selected image file is invalid.',
          400
        );
      }

      // AI moderation occurs BEFORE uploading the
      // image or creating the database record.
      const moderationResult = await scanImage(
        imageBuffer,
        imageFile.type
      );

      if (
        moderationResult.status === 'rejected'
      ) {
        return errorResponse(
          moderationResult.message,
          422
        );
      }

      if (
        moderationResult.status === 'review'
      ) {
        return errorResponse(
          'This image requires additional review before it can be published.',
          422
        );
      }

      if (
        moderationResult.status !== 'approved'
      ) {
        return errorResponse(
          'Image verification could not be completed.',
          503
        );
      }

      // Only approved images reach Supabase Storage.
      uploadedFilePath =
        `posts/${user.id}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await admin.storage
          .from('posts')
          .upload(
            uploadedFilePath,
            imageBuffer,
            {
              contentType: imageFile.type,
              upsert: false,
            }
          );

      if (uploadError) {
        console.error(
          'Supabase image upload failed:',
          uploadError.message
        );

        throw new Error(
          'Unable to upload the approved image.'
        );
      }

      const {
        data: { publicUrl },
      } = admin.storage
        .from('posts')
        .getPublicUrl(uploadedFilePath);

      imageUrl = publicUrl;
    }

    // Publish using the authenticated user's ID.
    // The browser cannot choose another user ID.
    const {
      data: post,
      error: insertError,
    } = await admin
      .from('posts')
      .insert({
        user_id: user.id,
        caption,
        image: imageUrl,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(
        'Supabase post insert failed:',
        insertError.message
      );

      throw new Error(
        'Unable to save the post.'
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Post published successfully.',
        postId: post.id,
      },
      { status: 201 }
    );
  } catch (error) {
    // Remove an uploaded image if post creation fails.
    if (uploadedFilePath) {
      const { error: cleanupError } =
        await admin.storage
          .from('posts')
          .remove([uploadedFilePath]);

      if (cleanupError) {
        console.error(
          'Unable to clean up uploaded image:',
          cleanupError.message
        );
      }
    }

    console.error(
      'Socials publishing error:',
      error
    );

    return errorResponse(
      'Unable to publish your post. Please try again.',
      503
    );
  }
}
