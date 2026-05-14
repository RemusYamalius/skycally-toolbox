export const loadOpenCV = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("OpenCV requires browser"));
      return;
    }

    if (window.cv && window.cv.Mat) {
      resolve();
      return;
    }

    const waitForReady = (onTimeout: () => void) => {
      const checkReady = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkReady);
        onTimeout();
      }, 30000);
    };

    const existing = document.getElementById("opencv-script");
    if (existing) {
      waitForReady(() => reject(new Error("OpenCV timeout")));
      return;
    }

    const script = document.createElement("script");
    script.id = "opencv-script";
    script.src = "https://docs.opencv.org/4.8.0/opencv.js";
    script.async = true;
    script.onload = () => waitForReady(() => reject(new Error("OpenCV not initialized")));
    script.onerror = () => reject(new Error("Failed to load OpenCV"));
    document.head.appendChild(script);
  });
};
