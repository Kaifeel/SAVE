const { injectFreshAutolinkingCache } = require('./fresh-autolinking-cache.cjs');

describe('injectFreshAutolinkingCache', () => {
  const settingsGradle = `pluginManagement {
  includeBuild('../node_modules/@react-native/gradle-plugin')
}

rootProject.name = 'save-app'
`;

  it('deletes generated autolinking state inside plugin management before plugins are applied', () => {
    const result = injectFreshAutolinkingCache(settingsGradle);

    expect(result.indexOf('SAVE_EAS_AUTOLINKING_CACHE_FIX'))
      .toBeGreaterThan(result.indexOf('pluginManagement {'));
    expect(result.indexOf('SAVE_EAS_AUTOLINKING_CACHE_FIX'))
      .toBeLessThan(result.indexOf("rootProject.name = 'save-app'"));
    expect(result).toContain('build/generated/autolinking');
    expect(result).toContain('if (!System.getProperty("os.name").toLowerCase().contains("windows"))');
    expect(result).toContain('autolinkingCacheDir.deleteDir()');
  });

  it('does not add the cache cleanup twice', () => {
    const once = injectFreshAutolinkingCache(settingsGradle);

    expect(injectFreshAutolinkingCache(once)).toBe(once);
  });
});
