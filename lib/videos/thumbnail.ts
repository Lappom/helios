export async function extractVideoThumbnail(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(1, video.duration / 4);
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const context = canvas.getContext("2d");

      if (!context) {
        cleanup();
        resolve(null);
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(
            new File([blob], "thumbnail.jpg", { type: "image/jpeg" }),
          );
        },
        "image/jpeg",
        0.85,
      );
    });

    video.addEventListener("error", () => {
      cleanup();
      resolve(null);
    });

    video.src = url;
  });
}

export async function getVideoDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";

    video.addEventListener("loadedmetadata", () => {
      const duration = Number.isFinite(video.duration)
        ? Math.round(video.duration)
        : null;
      URL.revokeObjectURL(url);
      video.remove();
      resolve(duration);
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      video.remove();
      resolve(null);
    });

    video.src = url;
  });
}
