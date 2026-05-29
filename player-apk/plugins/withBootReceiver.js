const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Expo Config Plugin: Auto-start app on device boot
 * Registers a BroadcastReceiver for BOOT_COMPLETED that launches the main activity
 */
module.exports = function withBootReceiver(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    // Find the main activity name
    const mainActivity = app.activity?.[0]?.["$"]?.["android:name"] || ".MainActivity";

    // Add BroadcastReceiver for BOOT_COMPLETED
    if (!app.receiver) {
      app.receiver = [];
    }

    // Check if already added
    const exists = app.receiver.some(
      (r) => r.$["android:name"] === ".BootReceiver"
    );

    if (!exists) {
      app.receiver.push({
        $: {
          "android:name": ".BootReceiver",
          "android:enabled": "true",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
              { $: { "android:name": "android.intent.action.QUICKBOOT_POWERON" } },
            ],
            category: [
              { $: { "android:name": "android.intent.category.DEFAULT" } },
            ],
          },
        ],
      });
    }

    return config;
  });
};
