export const removeBackground = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Sample background color from corners
      const corners = [
        [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
        [Math.floor(w / 2), 0], [0, Math.floor(h / 2)],
        [w - 1, Math.floor(h / 2)], [Math.floor(w / 2), h - 1],
      ];

      let rSum = 0, gSum = 0, bSum = 0;
      for (const [x, y] of corners) {
        const i = (y * w + x) * 4;
        rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
      }
      const bgR = rSum / corners.length;
      const bgG = gSum / corners.length;
      const bgB = bSum / corners.length;

      // Flood-fill from edges to find background pixels
      const visited = new Uint8Array(w * h);
      const queue: number[] = [];

      const enqueue = (x: number, y: number) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return;
        const idx = y * w + x;
        if (visited[idx]) return;
        const i = idx * 4;
        const dr = data[i] - bgR;
        const dg = data[i + 1] - bgG;
        const db = data[i + 2] - bgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist < 80) {
          visited[idx] = 1;
          queue.push(x, y);
        }
      };

      // Seed from all 4 edges
      for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
      for (let y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }

      let qi = 0;
      while (qi < queue.length) {
        const x = queue[qi++];
        const y = queue[qi++];
        enqueue(x + 1, y); enqueue(x - 1, y);
        enqueue(x, y + 1); enqueue(x, y - 1);
      }

      // Make background pixels transparent
      for (let i = 0; i < w * h; i++) {
        if (visited[i]) data[i * 4 + 3] = 0;
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to process image"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};
