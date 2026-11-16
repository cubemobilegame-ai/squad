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

    /** 0 = mały (jeden drop), 1 = średni (+1 drop), 2 = duży (+3 dropy) */
    protected int mode() { return 0; }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) draw(c, m, id, mode());
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
        draw(c, m, id, mode());
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

    static android.graphics.Bitmap bg(Context c, int wdp, int hdp, int c1, int c2, boolean sq) {
        float d = c.getResources().getDisplayMetrics().density;
        float w = wdp * d, h = hdp * d, k = Math.min(1f, 640f / Math.max(w, h));
        int bw = Math.max(40, Math.round(w * k)), bh = Math.max(40, Math.round(h * k));
        android.graphics.Bitmap b = android.graphics.Bitmap.createBitmap(bw, bh, android.graphics.Bitmap.Config.ARGB_8888);
        android.graphics.Canvas cv = new android.graphics.Canvas(b);
        float sw = bw, sh = bh;
        if (sq) { sw = sh = Math.min(bw, bh); cv.translate((bw - sw) / 2f, (bh - sh) / 2f); }
        float r = 26 * d * k;
        android.graphics.RectF rc = new android.graphics.RectF(0, 0, sw, sh);
        android.graphics.Path p = new android.graphics.Path();
        p.addRoundRect(rc, r, r, android.graphics.Path.Direction.CW);
        cv.clipPath(p);
        android.graphics.Paint pt = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        pt.setShader(new android.graphics.LinearGradient(0, 0, sw, sh, 0xFF101018, 0xFF1A1A26, android.graphics.Shader.TileMode.CLAMP));
        cv.drawRect(rc, pt);
        pt.setShader(new android.graphics.RadialGradient(sw * 0.12f, sh * 0.0f, Math.max(sw, sh) * 0.95f, (c1 & 0x00FFFFFF) | 0x66000000, 0x00000000, android.graphics.Shader.TileMode.CLAMP));
        cv.drawRect(rc, pt);
        pt.setShader(new android.graphics.RadialGradient(sw * 1.0f, sh * 1.0f, Math.max(sw, sh) * 0.7f, (c2 & 0x00FFFFFF) | 0x40000000, 0x00000000, android.graphics.Shader.TileMode.CLAMP));
        cv.drawRect(rc, pt);
        pt.setShader(null); pt.setStyle(android.graphics.Paint.Style.STROKE); pt.setStrokeWidth(Math.max(1f, 1.2f * d * k)); pt.setColor(0x26FFFFFF);
        cv.drawRoundRect(new android.graphics.RectF(pt.getStrokeWidth() / 2, pt.getStrokeWidth() / 2, sw - pt.getStrokeWidth() / 2, sh - pt.getStrokeWidth() / 2), r, r, pt);
        return b;
    }

    static int ic(Context c, String k) {
        int r = k == null || k.isEmpty() ? 0 : c.getResources().getIdentifier("ic3d_" + k, "drawable", c.getPackageName());
        return r != 0 ? r : c.getResources().getIdentifier("ic3d_other", "drawable", c.getPackageName());
    }

    static void draw(Context c, AppWidgetManager m, int id, int mode) {
        int lay = mode == 0 ? R.layout.squad_widget : (mode == 1 ? R.layout.squad_widget_m : R.layout.squad_widget_l);
        RemoteViews v = new RemoteViews(c.getPackageName(), lay);
        Bundle o = m.getAppWidgetOptions(id);
        int wd = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0), hd = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (wd < 60) wd = mode == 0 ? 110 : 250;
        if (hd < 60) hd = mode == 0 ? 110 : (mode == 1 ? 130 : 300);
        JSONArray arr = new JSONArray();
        try { arr = new JSONArray(c.getSharedPreferences("squad_widget", Context.MODE_PRIVATE).getString("drops", "[]")); } catch (Exception e) { }
        long now = System.currentTimeMillis();
        java.util.ArrayList<JSONObject> L = new java.util.ArrayList<>();
        for (int i = 0; i < arr.length(); i++) { JSONObject d = arr.optJSONObject(i); if (d != null && d.optLong("ts") + 2 * 3600000L > now) L.add(d); }
        int[] rowIds = {R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5}, rowE = {R.id.e1, R.id.e2, R.id.e3, R.id.e4, R.id.e5}, rowT = {R.id.t1, R.id.t2, R.id.t3, R.id.t4, R.id.t5}, rowW = {R.id.w1, R.id.w2, R.id.w3, R.id.w4, R.id.w5};
        int rows = mode == 0 ? 0 : (mode == 1 ? 2 : (hd >= 430 ? 5 : (hd >= 350 ? 4 : 3)));
        JSONObject f = L.isEmpty() ? null : L.get(0);
        int p1 = f == null ? 0xFFFFD0DC : col(f.optString("p1"), 0xFFFFD0DC), p2 = f == null ? 0xFFD7ECFF : col(f.optString("p2"), 0xFFD7ECFF);
        v.setImageViewBitmap(R.id.bg, bg(c, wd, hd, p1, p2, mode == 0));
        if (f == null) {
            v.setViewVisibility(R.id.card, View.GONE);
            v.setViewVisibility(R.id.empty, View.VISIBLE);
            v.setOnClickPendingIntent(R.id.root, open(c, "/new", 0));
        } else {
            v.setViewVisibility(R.id.card, View.VISIBLE);
            v.setViewVisibility(R.id.empty, View.GONE);
            long ts = f.optLong("ts");
            v.setImageViewResource(R.id.emoji, ic(c, f.optString("k")));
            v.setTextViewText(R.id.title, f.optString("t"));
            v.setTextViewText(R.id.kind, "host".equals(f.optString("r")) ? c.getString(R.string.w_host).toUpperCase() : "SQUAD");
            if (mode > 0) {
                String pl = f.optString("pl");
                v.setTextViewText(R.id.place, pl.isEmpty() ? "" : "📍 " + pl);
                v.setViewVisibility(R.id.place, pl.isEmpty() ? View.GONE : View.VISIBLE);
            }
            if (mode == 2) {
                int n = f.optInt("n", 0);
                v.setTextViewText(R.id.inn, "👥 " + n + " IN");
                v.setViewVisibility(R.id.inn, n > 0 ? View.VISIBLE : View.GONE);
            }
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
            if (mode > 0) for (int k = 0; k < rows; k++) {
                int idx = k + 1;
                if (idx < L.size()) {
                    JSONObject d = L.get(idx);
                    v.setViewVisibility(rowIds[k], View.VISIBLE);
                    v.setImageViewResource(rowE[k], ic(c, d.optString("k")));
                    v.setTextViewText(rowT[k], d.optString("t"));
                    v.setTextViewText(rowW[k], day(c, d.optLong("ts")));
                    v.setOnClickPendingIntent(rowIds[k], open(c, "/d/" + d.optString("id"), id * 10 + idx));
                } else v.setViewVisibility(rowIds[k], View.GONE);
            }
            if (mode == 2) {
                v.setOnClickPendingIntent(R.id.btnNew, open(c, "/new", id * 10 + 7));
                v.setOnClickPendingIntent(R.id.btnChat, open(c, "/chats", id * 10 + 8));
            }
        }
        if (mode == 0) {
            float dn = c.getResources().getDisplayMetrics().density, side = Math.min(wd, hd);
            int ph = Math.max(0, Math.round(((wd - side) / 2f + 12) * dn)), pv = Math.max(0, Math.round(((hd - side) / 2f + 12) * dn));
            v.setViewPadding(R.id.card, ph, pv, ph, pv);
            v.setViewPadding(R.id.empty, ph, pv, ph, pv);
        }
        m.updateAppWidget(id, v);
    }
}
