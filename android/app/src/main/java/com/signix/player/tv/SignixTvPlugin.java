package com.signix.player.tv;

import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SignixTv")
public class SignixTvPlugin extends Plugin {

  @PluginMethod
  public void enterImmersive(PluginCall call) {
    getActivity()
        .runOnUiThread(
            () -> {
              var window = getActivity().getWindow();
              window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
              var decor = window.getDecorView();
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(false);
                var insetsController = window.getInsetsController();
                if (insetsController != null) {
                  insetsController.hide(
                      android.view.WindowInsets.Type.statusBars()
                          | android.view.WindowInsets.Type.navigationBars());
                  insetsController.setSystemBarsBehavior(
                      android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
              } else {
                decor.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
              }
            });
    call.resolve();
  }

  @PluginMethod
  public void setKeepScreenOn(PluginCall call) {
    boolean on = call.getBoolean("on", true);
    getActivity()
        .runOnUiThread(
            () -> {
              if (on) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
              } else {
                getActivity()
                    .getWindow()
                    .clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
              }
            });
    call.resolve();
  }

  @PluginMethod
  public void startLockTask(PluginCall call) {
    getActivity()
        .runOnUiThread(
            () -> {
              try {
                getActivity().startLockTask();
                call.resolve();
              } catch (Exception e) {
                call.reject("startLockTask falhou. Em muitos dispositivos é preciso ativar 'Fixar app' manualmente ou usar perfil corporativo.", e);
              }
            });
  }

  @PluginMethod
  public void stopLockTask(PluginCall call) {
    getActivity()
        .runOnUiThread(
            () -> {
              try {
                getActivity().stopLockTask();
                call.resolve();
              } catch (Exception e) {
                call.reject("stopLockTask falhou", e);
              }
            });
  }
}
