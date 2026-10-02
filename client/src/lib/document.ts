import { extractPdfText } from "./pdf";
import { MAX_DESCRIPTION_TEXT_CHARS } from "./limits";

export async function extractMaterialText(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  if (fileName.endsWith(".docx")) {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    return result.value.trim().slice(0, MAX_DESCRIPTION_TEXT_CHARS);
  }

  if (fileName.endsWith(".pptx")) {
    const { default: JSZip } = await import("jszip");
    const archive = await JSZip.loadAsync(await file.arrayBuffer());
    const slides = Object.keys(archive.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort(
        (left, right) =>
          Number(left.match(/slide(\d+)\.xml$/)?.[1] ?? 0) -
          Number(right.match(/slide(\d+)\.xml$/)?.[1] ?? 0),
      );
    const slideText: string[] = [];
    let remaining = MAX_DESCRIPTION_TEXT_CHARS;

    for (const slidePath of slides) {
      const slideFile = archive.file(slidePath);
      if (!slideFile) continue;

      const xml = await slideFile.async("string");
      const document = new DOMParser().parseFromString(xml, "application/xml");
      const text = Array.from(document.getElementsByTagNameNS("*", "t"))
        .map((node) => node.textContent ?? "")
        .filter(Boolean)
        .join(" ");
      const excerpt = text.slice(0, remaining);

      if (excerpt) slideText.push(excerpt);
      remaining -= excerpt.length;
      if (remaining <= 0) break;
    }

    return slideText.join("\n").trim();
  }

  throw new Error("Choose a PDF, Word (.docx), or PowerPoint (.pptx) file.");
}
