package com.cubemobilegames.squad;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class SquadWidgetProvider extends AppWidgetProvider {
    static final String SITE = "https://squad-64cd5.web.app";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) draw(c, m, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
        draw(c, m, id);
    }

    static int col(String s, int def) {
        try { return Color.parseColor(s); } catch (Exception e) { return def; }
    }

    static String day(Context c, long ts) {
        Calendar a = Calendar.getInstance(), b = Calendar.getInstance();
        b.setTimeInMillis(ts);
        String time = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(ts));
        if (a.get(Calendar.YEAR) == b.get(Calendar.YEAR) && a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR)) return c.getString(R.string.w_today) + " " + time;
        a.add(Calendar.DAY_OF_YEAR, 1);
        if (a.get(Calendar.YEAR) == b.get(Calendar.YEAR) && a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR)) return c.getString(R.string.w_tomorrow) + " " + time;
        return new SimpleDateFormat("EEE d MMM", Locale.getDefault()).format(new Date(ts)) + " · " + time;
    }

    static PendingIntent open(Context c, String path, int req) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(SITE + path));
        i.setPackage(c.getPackageName());
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void draw(Context c, AppWidgetManager m, int id) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.squad_widget);
        Bundle o = m.getAppWidgetOptions(id);
        int h = o == null ? 110 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);
        int rows = h < 130 ? 0 : (h < 230 ? 1 : 3);   // małe: jeden drop, średnie: + 1, duże: + 3
        JSONArray arr = new JSONArray();
        try { arr = new JSONArray(c.getSharedPreferences("squad_widget", Context.MODE_PRIVATE).getString("drops", "[]")); } catch (Exception e) { }
        long now = System.currentTimeMillis();
        // pomijamy dropy, które skończyły się dawno (start + 2 h)
        java.util.ArrayList<JSONObject> L = new java.util.ArrayList<>();
        for (int i = 0; i < arr.length(); i++) { JSONObject d = arr.optJSONObject(i); if (d != null && d.optLong("ts") + 2 * 3600000L > now) L.add(d); }
        int[] rowIds = {R.id.row1, R.id.row2, R.id.row3}, rowE = {R.id.e1, R.id.e2, R.id.e3}, rowT = {R.id.t1, R.id.t2, R.id.t3}, rowW = {R.id.w1, R.id.w2, R.id.w3};
        if (L.isEmpty()) {
            v.setViewVisibility(R.id.card, View.GONE);
            v.setViewVisibility(R.id.empty, View.VISIBLE);
            v.setOnClickPendingIntent(R.id.root, open(c, "/", 0));
        } else {
            v.setViewVisibility(R.id.card, View.VISIBLE);
            v.setViewVisibility(R.id.empty, View.GONE);
            JSONObject f = L.get(0);
            long ts = f.optLong("ts");
            v.setInt(R.id.acc, "setBackgroundColor", col(f.optString("c1"), 0xFFFF4F86));
            v.setTextViewText(R.id.kind, "host".equals(f.optString("r")) ? c.getString(R.string.w_host) : "SQUAD");
            v.setTextViewText(R.id.emoji, f.optString("e", "✨"));
            v.setTextViewText(R.id.title, f.optString("t"));
            String pl = f.optString("pl");
            v.setTextViewText(R.id.place, pl.isEmpty() ? "" : "📍 " + pl);
            v.setViewVisibility(R.id.place, pl.isEmpty() || rows == 0 && h < 100 ? View.GONE : View.VISIBLE);
            if (ts <= now) {
                v.setViewVisibility(R.id.chrono, View.GONE);
                v.setViewVisibility(R.id.when, View.VISIBLE);
                v.setTextViewText(R.id.when, c.getString(R.string.w_now));
            } else if (Build.VERSION.SDK_INT >= 24 && ts - now < 24 * 3600000L) {
                v.setViewVisibility(R.id.when, View.GONE);
                v.setViewVisibility(R.id.chrono, View.VISIBLE);
                v.setChronometerCountDown(R.id.chrono, true);
                v.setChronometer(R.id.chrono, SystemClock.elapsedRealtime() + (ts - now), null, true);
            } else {
                v.setViewVisibility(R.id.chrono, View.GONE);
                v.setViewVisibility(R.id.when, View.VISIBLE);
                v.setTextViewText(R.id.when, day(c, ts));
            }
            v.setOnClickPendingIntent(R.id.root, open(c, "/d/" + f.optString("id"), id * 10));
            for (int k = 0; k < 3; k++) {
                int idx = k + 1;
                if (k < rows && idx < L.size()) {
                    JSONObject d = L.get(idx);
                    v.setViewVisibility(rowIds[k], View.VISIBLE);
                    v.setTextViewText(rowE[k], d.optString("e", "✨"));
                    v.setTextViewText(rowT[k], d.optString("t"));
                    v.setTextViewText(rowW[k], day(c, d.optLong("ts")));
                    v.setOnClickPendingIntent(rowIds[k], open(c, "/d/" + d.optString("id"), id * 10 + idx));
                } else v.setViewVisibility(rowIds[k], View.GONE);
            }
            v.setViewVisibility(R.id.more, rows == 3 && L.size() > 4 ? View.VISIBLE : View.GONE);
        }
        m.updateAppWidget(id, v);
    }
}
