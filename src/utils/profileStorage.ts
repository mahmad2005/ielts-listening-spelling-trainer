import type { ProfileData, UserProfile } from '../types'

const PROFILES_KEY = 'ielts_app_profiles'
const ACTIVE_PROFILE_ID_KEY = 'ielts_app_active_profile_id'
const PROFILE_DATA_PREFIX = 'ielts_app_data_'
const LEGACY_SETTINGS_KEY = 'ielts.spell.settings'
const LEGACY_WEAK_WORDS_KEY = 'ielts.spell.weakWords'
const LEGACY_FAVOURITES_KEY = 'ielts.spell.favourites'
const LEGACY_LATEST_RESULT_KEY = 'ielts.spell.latestResult'
const LEGACY_VOICE_URI_KEY = 'ielts.spell.voiceURI'

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const localStorageAdapter: StorageAdapter = {
  getItem(key) {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Ignore storage failures so the app remains usable.
    }
  },
  removeItem(key) {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore storage failures so the app remains usable.
    }
  },
}

let storageAdapter: StorageAdapter = localStorageAdapter

export function configureProfileStorage(adapter: StorageAdapter): void {
  storageAdapter = adapter
}

function nowISO(): string {
  return new Date().toISOString()
}

function readJSON<T>(key: string, fallback: T): T {
  const raw = storageAdapter.getItem(key)

  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T): void {
  storageAdapter.setItem(key, JSON.stringify(value))
}

function getProfileDataKey(profileId: string): string {
  return `${PROFILE_DATA_PREFIX}${profileId}`
}

function emptyProfileData(): ProfileData {
  return {
    settings: null,
    weakWords: [],
    resultHistory: [],
    wordStats: {},
    favourites: [],
  }
}

function readLegacySeedData(): Partial<ProfileData> {
  const settings = readJSON<ProfileData['settings']>(LEGACY_SETTINGS_KEY, null)
  const weakWords = readJSON<ProfileData['weakWords']>(LEGACY_WEAK_WORDS_KEY, [])
  const favourites = readJSON<ProfileData['favourites']>(LEGACY_FAVOURITES_KEY, [])
  const latestResult = readJSON<ProfileData['resultHistory'][number] | null>(LEGACY_LATEST_RESULT_KEY, null)
  const savedVoiceURI = readJSON<string>(LEGACY_VOICE_URI_KEY, '')

  return {
    settings: settings
      ? {
          ...settings,
          voiceURI: savedVoiceURI || settings.voiceURI,
        }
      : null,
    weakWords,
    favourites,
    resultHistory: latestResult ? [latestResult] : [],
    wordStats: {},
  }
}

function sanitizeProfileData(input: Partial<ProfileData> | null | undefined): ProfileData {
  return {
    settings: input?.settings ?? null,
    weakWords: Array.isArray(input?.weakWords) ? input.weakWords : [],
    resultHistory: Array.isArray(input?.resultHistory) ? input.resultHistory : [],
    wordStats:
      input?.wordStats && typeof input.wordStats === 'object' && !Array.isArray(input.wordStats)
        ? input.wordStats
        : {},
    favourites: Array.isArray(input?.favourites) ? input.favourites : [],
  }
}

function saveProfiles(profiles: UserProfile[]): void {
  writeJSON(PROFILES_KEY, profiles)
}

function touchProfile(profileId: string): void {
  const profiles = getProfiles()
  const nextProfiles = profiles.map((profile) =>
    profile.id === profileId
      ? {
          ...profile,
          lastActiveAt: nowISO(),
        }
      : profile,
  )

  saveProfiles(nextProfiles)
}

function makeProfileId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function getProfiles(): UserProfile[] {
  const raw = readJSON<UserProfile[]>(PROFILES_KEY, [])

  return raw
    .filter((profile) => typeof profile?.id === 'string' && typeof profile?.name === 'string')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export function getActiveProfileId(): string | null {
  const profileId = readJSON<string | null>(ACTIVE_PROFILE_ID_KEY, null)

  if (!profileId) {
    return null
  }

  return getProfiles().some((profile) => profile.id === profileId) ? profileId : null
}

export function hasActiveProfile(): boolean {
  return getActiveProfileId() !== null
}

export function getActiveProfile(): UserProfile | null {
  const activeProfileId = getActiveProfileId()

  if (!activeProfileId) {
    return null
  }

  return getProfiles().find((profile) => profile.id === activeProfileId) ?? null
}

export function setActiveProfile(profileId: string | null): void {
  if (!profileId) {
    storageAdapter.removeItem(ACTIVE_PROFILE_ID_KEY)
    return
  }

  const exists = getProfiles().some((profile) => profile.id === profileId)
  if (!exists) {
    storageAdapter.removeItem(ACTIVE_PROFILE_ID_KEY)
    return
  }

  writeJSON(ACTIVE_PROFILE_ID_KEY, profileId)
  touchProfile(profileId)
}

export function createProfile(name: string): UserProfile | null {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return null
  }

  const existingProfiles = getProfiles()

  const timestamp = nowISO()
  const profile: UserProfile = {
    id: makeProfileId(),
    name: trimmedName,
    createdAt: timestamp,
    lastActiveAt: timestamp,
  }

  saveProfiles([...existingProfiles, profile])
  writeJSON(
    getProfileDataKey(profile.id),
    sanitizeProfileData(existingProfiles.length === 0 ? { ...emptyProfileData(), ...readLegacySeedData() } : emptyProfileData()),
  )
  setActiveProfile(profile.id)

  return profile
}

export function renameProfile(profileId: string, name: string): UserProfile | null {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return null
  }

  const profiles = getProfiles()
  const target = profiles.find((profile) => profile.id === profileId)
  if (!target) {
    return null
  }

  const updatedProfile: UserProfile = {
    ...target,
    name: trimmedName,
    lastActiveAt: target.lastActiveAt,
  }

  saveProfiles(profiles.map((profile) => (profile.id === profileId ? updatedProfile : profile)))
  return updatedProfile
}

export function deleteProfile(profileId: string): void {
  saveProfiles(getProfiles().filter((profile) => profile.id !== profileId))
  storageAdapter.removeItem(getProfileDataKey(profileId))

  if (getActiveProfileId() === profileId) {
    storageAdapter.removeItem(ACTIVE_PROFILE_ID_KEY)
  }
}

export function getProfileData(profileId: string): ProfileData {
  return sanitizeProfileData(readJSON<ProfileData>(getProfileDataKey(profileId), emptyProfileData()))
}

export function saveProfileData(profileId: string, data: ProfileData): void {
  writeJSON(getProfileDataKey(profileId), sanitizeProfileData(data))
  touchProfile(profileId)
}

export function updateProfileData(profileId: string, updater: (current: ProfileData) => ProfileData): ProfileData {
  const nextData = sanitizeProfileData(updater(getProfileData(profileId)))
  saveProfileData(profileId, nextData)
  return nextData
}

export function getActiveProfileData(): ProfileData {
  const activeProfileId = getActiveProfileId()
  return activeProfileId ? getProfileData(activeProfileId) : emptyProfileData()
}

export function updateActiveProfileData(updater: (current: ProfileData) => ProfileData): ProfileData {
  const activeProfileId = getActiveProfileId()
  if (!activeProfileId) {
    return emptyProfileData()
  }

  return updateProfileData(activeProfileId, updater)
}