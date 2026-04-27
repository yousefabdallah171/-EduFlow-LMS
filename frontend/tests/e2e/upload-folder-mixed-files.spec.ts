import { expect, test } from "@playwright/test";

test("folder drop accepts supported videos and rejects mixed unsupported files", async ({ page }) => {
  await page.goto("/");

  const summary = await page.evaluate(async () => {
    const { summarizeDroppedFiles } = await import("/src/components/admin/uploader/UploadDropzone.tsx");

    const files = [
      { name: "lesson-01.mp4", type: "video/mp4", size: 1024 },
      { name: "lesson-02.webm", type: "video/webm", size: 2048 },
      { name: "poster.png", type: "image/png", size: 512 },
      { name: "guide.pdf", type: "application/pdf", size: 600 }
    ];

    return summarizeDroppedFiles(files as File[], {
      allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
      maxSizeBytes: 10_000_000
    });
  });

  expect(summary.accepted).toBe(2);
  expect(summary.rejected).toBe(2);
  expect(summary.rejectedDetails.length).toBe(2);
});
