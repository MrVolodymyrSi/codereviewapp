import { listRender } from './list-render'
import { fetchRace } from './fetch-race'
import { videoFeed } from './video-feed'
import type { Challenge } from '../types/challenge'

export const challenges: Challenge[] = [listRender, fetchRace, videoFeed]
