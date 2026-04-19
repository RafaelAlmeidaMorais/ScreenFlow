const {
  withDangerousMod,
  withAndroidManifest,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo Config Plugin: Auto-start app on device boot
 * 1. Registers a BroadcastReceiver in AndroidManifest.xml for BOOT_COMPLETED
 * 2. Creates the BootReceiver.java class file
 */

function withBootReceiverManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    // Ensure receiver array exists
    if (!app.receiver) {
      app.receiver = [];
    }

    // Check if already added
    const exists = app.receiver.some(
      (r) => r.$ && r.$["android:name"] === ".BootReceiver"
    );

    if (!exists) {
      app.receiver.push({
        $: {
          "android:name": ".BootReceiver",
          "android:enabled": "true",
          "android:exported": "true",
          "android:directBootAware": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.intent.action.BOOT_COMPLETED",
                },
              },
              {
                $: {
                  "android:name": "android.intent.action.QUICKBOOT_POWERON",
                },
              },
              {
                $: {
                  "android:name":
                    "com.htc.intent.action.QUICKBOOT_POWERON",
                },
              },
            ],
            category: [
              {
                $: { "android:name": "android.intent.category.DEFAULT" },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
}

function withBootReceiverClass(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const packageName =
        config.android?.package || "com.screenflow.player";
      const packagePath = packageName.replace(/\./g, "/");
      const projectRoot = config.modRequest.platformProjectRoot;
      const javaDir = path.join(
        projectRoot,
        "app",
        "src",
        "main",
        "java",
        packagePath
      );

      // Ensure directory exists
      fs.mkdirSync(javaDir, { recursive: true });

      const bootReceiverCode = `package ${packageName};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "ScreenFlowBoot";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        Log.d(TAG, "Received action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            try {
                Intent launchIntent = context.getPackageManager()
                        .getLaunchIntentForPackage(context.getPackageName());
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                            | Intent.FLAG_ACTIVITY_CLEAR_TOP
                            | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                    context.startActivity(launchIntent);
                    Log.d(TAG, "App started successfully after boot");
                } else {
                    Log.e(TAG, "Launch intent is null");
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to start app after boot: " + e.getMessage());
            }
        }
    }
}
`;

      const filePath = path.join(javaDir, "BootReceiver.java");
      fs.writeFileSync(filePath, bootReceiverCode);
      console.log("[withAutoStart] Created BootReceiver.java at: " + filePath);

      return config;
    },
  ]);
}

module.exports = function withAutoStart(config) {
  config = withBootReceiverManifest(config);
  config = withBootReceiverClass(config);
  return config;
};
