import { createContext, useContext } from 'react'

export type PlayerControls = {
  seekTo: (seconds: number) => void
}

export const PlayerContext = createContext<PlayerControls>({ seekTo: () => undefined })

export function usePlayer(): PlayerControls {
  return useContext(PlayerContext)
}
