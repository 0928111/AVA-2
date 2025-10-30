import create from 'zustand'

type State = {
  connected: boolean
  setConnected: (v: boolean) => void
}

export const useStore = create<State>((set) => ({
  connected: false,
  setConnected: (v: boolean) => set({ connected: v })
}))

export default useStore
