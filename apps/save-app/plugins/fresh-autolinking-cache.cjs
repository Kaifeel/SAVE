const { withSettingsGradle } = require('expo/config-plugins');

const marker = 'SAVE_EAS_AUTOLINKING_CACHE_FIX';
const cleanup = `  // ${marker}
  // EAS builds on Linux must not reuse autolinking metadata generated on Windows.
  def autolinkingCacheDir = new File(rootDir, "build/generated/autolinking")
  if (!System.getProperty("os.name").toLowerCase().contains("windows")) {
    autolinkingCacheDir.deleteDir()
  }`;

/**
 * @param {string} contents
 * @returns {string}
 */
function injectFreshAutolinkingCache(contents) {
  if (contents.includes(marker)) return contents;
  const pluginManagementStart = 'pluginManagement {';
  if (!contents.includes(pluginManagementStart)) {
    throw new Error('Unable to locate pluginManagement block in settings.gradle');
  }
  return contents.replace(
    pluginManagementStart,
    `${pluginManagementStart}\n${cleanup}`,
  );
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withFreshAutolinkingCache = config =>
  withSettingsGradle(config, settingsConfig => {
    settingsConfig.modResults.contents = injectFreshAutolinkingCache(
      settingsConfig.modResults.contents,
    );
    return settingsConfig;
  });

module.exports = withFreshAutolinkingCache;
module.exports.injectFreshAutolinkingCache = injectFreshAutolinkingCache;
