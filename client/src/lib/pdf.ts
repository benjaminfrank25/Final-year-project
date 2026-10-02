import { pdfjs } from "react-pdf";
import { MAX_DESCRIPTION_TEXT_CHARS } from "./limits";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export { Document, Page } from "react-pdf";

export async function extractPdfText(file: File): Promise<string> {
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });

  try {
    const document = await loadingTask.promise;
    const pages: string[] = [];
    let remaining = MAX_DESCRIPTION_TEXT_CHARS;

    for (
      let pageNumber = 1;
      pageNumber <= Math.min(document.numPages, 15);
      pageNumber += 1
    ) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");
      const excerpt = pageText.slice(0, remaining);

      if (excerpt) pages.push(excerpt);
      remaining -= excerpt.length;
      if (remaining <= 0) break;
    }

    return pages.join("\n").trim();
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}
