import { describe, expect, it } from "vitest";

import { summarizeDroppedFiles } from "@/components/admin/uploader/UploadDropzone";

const createMockFile = (name: string, type: string, size: number) =>
  ({
    name,
    type,
    size
  } as File);

describe("summarizeDroppedFiles", () => {
  it("accepts supported files and rejects unsupported ones", () => {
    const files = [
      createMockFile("lesson-01.mp4", "video/mp4", 1000),
      createMockFile("notes.pdf", "application/pdf", 1000),
      createMockFile("image.png", "image/png", 1000)
    ];

    const summary = summarizeDroppedFiles(files, {
      allowedMimeTypes: ["video/mp4", "video/webm"]
    });

    expect(summary.accepted).toBe(1);
    expect(summary.rejected).toBe(2);
    expect(summary.rejectedDetails[0]?.reason).toContain("Unsupported");
  });

  it("rejects files over max size", () => {
    const files = [createMockFile("large.mp4", "video/mp4", 9_000_000)];

    const summary = summarizeDroppedFiles(files, {
      allowedMimeTypes: ["video/mp4"],
      maxSizeBytes: 1_000_000
    });

    expect(summary.accepted).toBe(0);
    expect(summary.rejected).toBe(1);
    expect(summary.rejectedDetails[0]?.reason).toContain("size");
  });

  it("rejects duplicates from existing list and inside the same drop", () => {
    const files = [
      createMockFile("lesson-01.mp4", "video/mp4", 1000),
      createMockFile("lesson-01.mp4", "video/mp4", 1200),
      createMockFile("lesson-02.mp4", "video/mp4", 1200)
    ];

    const summary = summarizeDroppedFiles(files, {
      allowedMimeTypes: ["video/mp4"],
      existingNames: ["lesson-02.mp4"]
    });

    expect(summary.accepted).toBe(1);
    expect(summary.rejected).toBe(2);
    expect(summary.rejectedDetails.every((entry) => entry.reason.includes("Duplicate"))).toBe(true);
  });
});
