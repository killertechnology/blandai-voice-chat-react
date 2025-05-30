export function getEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}



export const BLAND_API_KEY = getEnvVar('REACT_APP_BLAND_API_KEY') 