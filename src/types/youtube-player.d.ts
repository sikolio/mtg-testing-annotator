declare module "youtube-player" {
  export type YouTubePlayerOptions = {
    videoId: string;
    playerVars?: Record<string, number | string>;
  };

  export interface YouTubePlayerInstance {
    destroy?: () => Promise<void> | void;
    cueVideoById: (videoId: string, startSeconds?: number) => Promise<void>;
    getCurrentTime: () => Promise<number>;
    pauseVideo: () => Promise<void>;
    playVideo: () => Promise<void>;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => Promise<void>;
    on: (eventName: string, listener: (event: { data: number }) => void) => void;
    off: (listener: (event: { data: number }) => void) => void;
  }

  export default function youTubePlayer(
    element: HTMLElement | string,
    options: YouTubePlayerOptions
  ): YouTubePlayerInstance;
}
