import Hls from "hls.js";
import { useEffect, useRef } from "react";

const hlsSource =
  "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";

export default function HlsBackgroundVideo({
  className = "",
}: {
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(hlsSource);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsSource;
    }

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => undefined);
    }

    return () => {
      hls?.destroy();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={`landing-video ${className}`}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
    />
  );
}
