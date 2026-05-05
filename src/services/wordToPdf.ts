const API_URL =
  import.meta.env.VITE_API_URL || "https://skycally-api-production.up.railway.app";

export async function convertWordToPdf(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/word-to-pdf`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = "Conversion failed";
    try {
      const j = await response.json();
      if (j?.detail) detail = String(j.detail);
    } catch {}
    throw new Error(detail);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name.replace(/\.docx?$/i, ".pdf");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
