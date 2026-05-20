declare module "youtube-player" {
  export type YouTubePlayerOptions = {
    videoId: string;
    playerVars?: Record<string, number | string>;
  };

  export interface YouTubePlayerInstance {
    destroy?: () => Promise<void> | void;
    getCurrentTime: () => Promise<number>;
    pauseVideo: () => Promise<void>;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => Promise<void>;
  }

  export default function youTubePlayer(
    element: HTMLElement | string,
    options: YouTubePlayerOptions
  ): YouTubePlayerInstance;
}
