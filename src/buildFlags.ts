/**
 * Build-time switches. CI rewrites this file before each Gradle build
 * (see .github/workflows/android.yml): the Google Play bundle (.aab) gets
 * 'live', the GitHub test APK keeps 'preview'.
 */
export const PAYWALL: 'live' | 'preview' = 'preview';
