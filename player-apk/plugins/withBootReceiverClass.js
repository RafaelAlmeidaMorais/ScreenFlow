const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo Config Plugin: Creates the BootReceiver.java class
 * This class is called by Android when the device boots up
 */
module.exports = function withBootReceiverClass(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const packageName = config.android?.package || "com.screenflow.player";
      const packagePath = packageName.replace(/\./g, "/");
      const javaDir = path.join(
        config.modRequest.platformProjectRoot,
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

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            Intent launchIntent = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(launchIntent);
            }
        }
    }
}
`;

      fs.writeFileSync(
        path.join(javaDir, "BootReceiver.java"),
        bootReceiverCode
      );

      return config;
    },
  ]);
};
