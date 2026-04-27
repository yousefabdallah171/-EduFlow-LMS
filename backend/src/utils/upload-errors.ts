export type UploadErrorCode =
  | "UPLOAD_SESSION_NOT_FOUND"
  | "UPLOAD_SESSION_ALREADY_COMPLETED"
  | "UPLOAD_INVALID_CHUNK_INDEX"
  | "UPLOAD_CHUNK_CHECKSUM_MISMATCH"
  | "UPLOAD_MAX_RETRY_EXCEEDED"
  | "UPLOAD_FILE_TOO_LARGE"
  | "UPLOAD_UNSUPPORTED_FILE_TYPE"
  | "UPLOAD_DUPLICATE_DETECTED"
  | "UPLOAD_STORAGE_QUOTA_EXCEEDED"
  | "MEDIA_INTEGRITY_CHECK_FAILED"
  | "MEDIA_PROCESSING_FAILED"
  | "LESSON_ATTACHMENT_CONFLICT";

type UploadErrorDescriptor = {
  status: number;
  message: string;
  retryable: boolean;
};

export const uploadErrorMap: Record<UploadErrorCode, UploadErrorDescriptor> = {
  UPLOAD_SESSION_NOT_FOUND: {
    status: 404,
    message: "Upload session was not found.",
    retryable: false
  },
  UPLOAD_SESSION_ALREADY_COMPLETED: {
    status: 409,
    message: "Upload session is already completed.",
    retryable: false
  },
  UPLOAD_INVALID_CHUNK_INDEX: {
    status: 409,
    message: "Chunk index is invalid for the current upload state.",
    retryable: true
  },
  UPLOAD_CHUNK_CHECKSUM_MISMATCH: {
    status: 422,
    message: "Chunk checksum did not match the expected value.",
    retryable: true
  },
  UPLOAD_MAX_RETRY_EXCEEDED: {
    status: 429,
    message: "Maximum retry attempts reached for this upload item.",
    retryable: false
  },
  UPLOAD_FILE_TOO_LARGE: {
    status: 413,
    message: "The selected file exceeds the configured upload size limit.",
    retryable: false
  },
  UPLOAD_UNSUPPORTED_FILE_TYPE: {
    status: 415,
    message: "The selected file type is not supported for this upload.",
    retryable: false
  },
  UPLOAD_DUPLICATE_DETECTED: {
    status: 409,
    message: "A matching media item already exists.",
    retryable: false
  },
  UPLOAD_STORAGE_QUOTA_EXCEEDED: {
    status: 507,
    message: "Storage quota is exceeded for this account.",
    retryable: false
  },
  MEDIA_INTEGRITY_CHECK_FAILED: {
    status: 422,
    message: "Media integrity checks failed after upload completion.",
    retryable: true
  },
  MEDIA_PROCESSING_FAILED: {
    status: 500,
    message: "Media processing failed. Please retry later.",
    retryable: true
  },
  LESSON_ATTACHMENT_CONFLICT: {
    status: 409,
    message: "Lesson already has an active primary attachment.",
    retryable: false
  }
};

export const getUploadError = (code: UploadErrorCode) => uploadErrorMap[code];
