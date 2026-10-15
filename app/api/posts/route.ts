
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scanImage } from '@/app/utils/moderation/scan-image';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_REQUEST_SIZE = 6 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 500;
const READ_TIMEOUT_MS = 15000;

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Type returned by the custom Supabase rate-limiting RPC.
type RateLimitResult = {
  allowed: boolean;
  retry_after_seconds: number;
};

function errorResponse(
  message: string,
  status: number,
  retryAfter?: number
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers:
        retryAfter !== undefined
          ? { 'Retry-After': String(retryAfter) }
          : undefined,
    }
  );
}

class RequestTooLargeError extends Error {}
class RequestTimeoutError extends Error {}

/**
 * Read an upload while enforcing a strict application-level
 * request size limit and a total read timeout.
 *
 * NGINX should independently enforce the upstream 6 MB limit.
 */
async function readLimitedBody(
  request: NextRequest
): Promise<Uint8Array<ArrayBuffer>> {
  if (!request.body) {
    throw new Error('Missing request body.');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];

  let total = 0;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, READ_TIMEOUT_MS);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutController.signal.addEventListener(
      'abort',
      () => reject(new RequestTimeoutError()),
      { once: true }
    );
  });

  let completed = false;

  try {
    while (true) {
      const result = await Promise.race([
        reader.read(),
        timeoutPromise,
      ]);

      if (result.done) {
        completed = true;
        break;
      }

      total += result.value.byteLength;

      if (total > MAX_REQUEST_SIZE) {
        throw new RequestTooLargeError();
      }

      chunks.push(result.value);
    }

    const combined = new Uint8Array(
      new ArrayBuffer(total)
    );

    let offset = 0;

    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return combined;
  } finally {
    clearTimeout(timeoutId);

    if (!completed) {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancellation errors during cleanup.
      }
    }

    reader.releaseLock();
  }
}

/**
 * Verify the actual file signature instead of trusting
 * the MIME type supplied by the browser.
 */
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
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      )
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

/**
 * Validate the shape of the custom rate-limiting RPC response.
 */
function isRateLimitResult(
  value: unknown
): value is RateLimitResult {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('allowed' in value) ||
    !('retry_after_seconds' in value)
  ) {
    return false;
  }

  return (
    typeof value.allowed === 'boolean' &&
    typeof value.retry_after_seconds === 'number' &&
    Number.isFinite(value.retry_after_seconds) &&
    value.retry_after_seconds >= 0
  );
}

export async function POST(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fail closed when required server configuration is missing.
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return errorResponse(
      'Publishing service is not configured.',
      503
    );
  }

  // Require a valid Supabase access token.
  const authorization =
    request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return errorResponse(
      'Please log in to publish a post.',
      401
    );
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return errorResponse(
      'Invalid authentication token.',
      401
    );
  }

  // Authenticate using the public Supabase client.
  const authClient = createClient(
    supabaseUrl,
    anonKey,
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
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    return errorResponse(
      'Your session has expired. Please log in again.',
      401
    );
  }

  // Server-only administrative client.
  // Never expose the service role key to the browser.
  const admin = createClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  /**
   * RATE LIMITING
   *
   * The Supabase database function atomically enforces
   * 10 publishing attempts per 10-minute window.
   *
   * Check this before reading uploads or calling OpenAI.
   */
  const {
    data: rateResult,
    error: rateError,
  } = await admin
    .rpc('consume_post_rate_limit', {
      p_user_id: user.id,
    })
    .single();

  if (rateError || !rateResult) {
    console.error(
      'Rate limiter unavailable:',
      rateError
    );

    return errorResponse(
      'Publishing is temporarily unavailable.',
      503
    );
  }

  // Validate the RPC response safely.
  // This also resolves the TypeScript TS2339 errors.
  if (!isRateLimitResult(rateResult)) {
    console.error(
      'Invalid rate limiter response:',
      rateResult
    );

    return errorResponse(
      'Publishing is temporarily unavailable.',
      503
    );
  }

  if (!rateResult.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil(rateResult.retry_after_seconds)
    );

    return errorResponse(
      'Too many publishing attempts. Please try again later.',
      429,
      retryAfter
    );
  }

  /**
   * REQUEST VALIDATION
   */
  const contentType =
    request.headers.get('content-type') ?? '';

  if (
    !contentType
      .toLowerCase()
      .startsWith('multipart/form-data;')
  ) {
    return errorResponse(
      'Expected a multipart form submission.',
      415
    );
  }

  // Reject oversized requests based on Content-Length.
  const declaredLength =
    request.headers.get('content-length');

  if (declaredLength !== null) {
    const length = Number(declaredLength);

    if (
      !Number.isFinite(length) ||
      length < 0
    ) {
      return errorResponse(
        'Invalid request size.',
        400
      );
    }

    if (length > MAX_REQUEST_SIZE) {
      return errorResponse(
        'Request exceeds the 6 MB limit.',
        413
      );
    }
  }

  let uploadedPath: string | null = null;

  try {
    /**
     * Read the actual body with a 6 MB limit.
     * Do not rely solely on Content-Length.
     */
    const body = await readLimitedBody(request);

    // Parse multipart data only after the size check.
    const parsedRequest = new Request(
      'http://localhost/api/posts',
      {
        method: 'POST',
        headers: {
          'content-type': contentType,
        },
        body,
      }
    );

    const formData = await parsedRequest.formData();

    /**
     * CAPTION VALIDATION
     */
    const captionValue = formData.get('caption');

    if (
      captionValue !== null &&
      typeof captionValue !== 'string'
    ) {
      return errorResponse(
        'Invalid caption.',
        400
      );
    }

    const caption =
      typeof captionValue === 'string'
        ? captionValue.trim()
        : '';

    if (caption.length > MAX_CAPTION_LENGTH) {
      return errorResponse(
        'Caption cannot exceed 500 characters.',
        400
      );
    }

    /**
     * IMAGE VALIDATION
     */
    const imageValue = formData.get('image');

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

    if (imageFile) {
      // Require AI moderation to be configured.
      if (!process.env.OPENAI_API_KEY) {
        return errorResponse(
          'Image moderation is not configured.',
          503
        );
      }

      const extension =
        IMAGE_TYPES[imageFile.type];

      if (!extension) {
        return errorResponse(
          'Only JPEG, PNG and WebP images are supported.',
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

      // Reject files with mismatched image signatures.
      if (
        !isValidImageSignature(
          imageBuffer,
          imageFile.type
        )
      ) {
        return errorResponse(
          'The selected image is invalid.',
          400
        );
      }

      /**
       * AI IMAGE MODERATION
       *
       * Scan before uploading to Supabase Storage.
       */
      const moderationResult = await scanImage(
        imageBuffer,
        imageFile.type
      );

      if (moderationResult.status === 'rejected') {
        return errorResponse(
          moderationResult.message,
          422
        );
      }

      if (moderationResult.status === 'review') {
        return errorResponse(
          'This image requires additional review before publication.',
          422
        );
      }

      if (moderationResult.status !== 'approved') {
        return errorResponse(
          'Image verification could not be completed.',
          503
        );
      }

      /**
       * UPLOAD APPROVED IMAGE
       */
      uploadedPath =
        `posts/${user.id}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await admin.storage
          .from('posts')
          .upload(uploadedPath, imageBuffer, {
            contentType: imageFile.type,
            upsert: false,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = admin.storage
        .from('posts')
        .getPublicUrl(uploadedPath);

      imageUrl = data.publicUrl;
    }

    /**
     * CREATE POST
     *
     * Images reach this point only after moderation approval.
     */
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
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Post published successfully.',
        postId: post.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    /**
     * CLEANUP
     *
     * Remove any uploaded image if publishing fails.
     */
    if (uploadedPath) {
      const { error: cleanupError } =
        await admin.storage
          .from('posts')
          .remove([uploadedPath]);

      if (cleanupError) {
        console.error(
          'Unable to clean up uploaded image:',
          cleanupError.message
        );
      }
    }

    if (error instanceof RequestTooLargeError) {
      return errorResponse(
        'Request exceeds the 6 MB limit.',
        413
      );
    }

    if (error instanceof RequestTimeoutError) {
      return errorResponse(
        'Upload timed out. Please try again.',
        408
      );
    }

    console.error(
      'Socials publishing failed:',
      error
    );

    return errorResponse(
      'Unable to publish your post. Please try again.',
      503
    );
  }
}
