import MaterialForm from "./MaterialForm";
import type { MaterialFormValues } from "./MaterialForm";
import { apiForm } from "../lib/api";
import type { Level, Semester } from "../types";

type UploadPanelProps = {
  defaultSemester: Semester;
  lockedLevel?: Level;
  onUploaded: () => void;
};

export default function UploadPanel({
  defaultSemester,
  lockedLevel,
  onUploaded,
}: UploadPanelProps) {
  async function upload(values: MaterialFormValues, file: File | null) {
    if (!file)
      throw new Error(
        "Choose a PDF, Word (.docx), or PowerPoint (.pptx) file to upload",
      );

    const form = new FormData();
    form.append("title", values.title);
    if (values.lecturerName) form.append("lecturerName", values.lecturerName);
    form.append("courseCode", values.courseCode);
    form.append("level", String(values.level));
    form.append("semester", values.semester);
    form.append("category", values.category);
    if (values.description) form.append("description", values.description);
    form.append("file", file);

    await apiForm<unknown>("/materials", form);
    onUploaded();
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">Upload study material</h2>
      <p className="mt-1 mb-5 text-sm text-gray-500">
        {lockedLevel !== undefined
          ? `Students in ${lockedLevel} Level will see it straight away.`
          : "Only students of the level you pick will be able to see it."}
      </p>

      <MaterialForm
        mode="create"
        defaultSemester={defaultSemester}
        lockedLevel={lockedLevel}
        submitLabel="Upload material"
        onSubmit={upload}
      />
    </div>
  );
}
