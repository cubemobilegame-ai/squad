package com.cubemobilegames.squad;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SquadWidget")
public class SquadWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        Context c = getContext();
        String json = call.getString("json", "[]");
        c.getSharedPreferences("squad_widget", Context.MODE_PRIVATE).edit().putString("drops", json).apply();
        Class<?>[] cls = {SquadWidgetProvider.class, SquadWidgetMedium.class};
        for (Class<?> k : cls) {
            int[] ids = AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c, k));
            if (ids.length == 0) continue;
            Intent i = new Intent(c, k);
            i.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            c.sendBroadcast(i);
        }
        call.resolve();
    }

    @PluginMethod
    public void pending(PluginCall call) {
        com.getcapacitor.JSObject r = new com.getcapacitor.JSObject();
        r.put("v", false);
        call.resolve(r);
    }
}
