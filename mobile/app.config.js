// Bare expo-notifications defaults to sandbox entitlements while non-dev push-token.ts reports production, silently losing TestFlight/App Store pushes.
// Derive APNs mode from release workflow env; Expo still supplies app.json, including Fastlane version/buildNumber rewrites, for everything else.
const APS_ENVIRONMENT =
  process.env.ORCA_IOS_APS_ENVIRONMENT === 'production' ? 'production' : 'development'

module.exports = ({ config }) => {
  const iosDevClient = process.env.ORCA_IOS_DEV_CLIENT === '1'
  const entitlements = { ...config.ios?.entitlements }
  if (iosDevClient) {
    delete entitlements['aps-environment']
  } else {
    entitlements['aps-environment'] = APS_ENVIRONMENT
  }

  return {
    ...config,
    ...(iosDevClient && { name: 'Orca Dev', slug: 'robbo-orca-dev', scheme: 'robbo-orca-dev' }),
    // `expo run` installs a dev-client build cached for the current native fingerprint instead of
    // rebuilding; scripts/native-client.mjs populates the cache.
    buildCacheProvider: { plugin: './scripts/native-build-cache.cjs' },
    ios: {
      ...config.ios,
      ...(iosDevClient && { bundleIdentifier: 'dev.robbo.orca.mobile' }),
      entitlements
    },
    plugins: (config.plugins ?? []).map((plugin) =>
      plugin === 'expo-notifications'
        ? [
            'expo-notifications',
            {
              ...(iosDevClient && { enableRemoteNotifications: false }),
              enableBackgroundRemoteNotifications: !iosDevClient,
              mode: APS_ENVIRONMENT,
              icon: './assets/notification-icon.png'
            }
          ]
        : plugin
    )
  }
}
