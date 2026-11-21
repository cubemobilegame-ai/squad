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

    /** 0 = mały, 1 = średni */
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
        pt.setColor(0xFF000000); cv.drawRect(rc, pt);
        pt.setShader(null); pt.setStyle(android.graphics.Paint.Style.STROKE); pt.setStrokeWidth(Math.max(1f, 1.2f * d * k)); pt.setColor(0x24FFFFFF);
        cv.drawRoundRect(new android.graphics.RectF(pt.getStrokeWidth() / 2, pt.getStrokeWidth() / 2, sw - pt.getStrokeWidth() / 2, sh - pt.getStrokeWidth() / 2), r, r, pt);
        return b;
    }

    static int ic(Context c, String k) {
        int r = k == null || k.isEmpty() ? 0 : c.getResources().getIdentifier("ic3d_" + k, "drawable", c.getPackageName());
        return r != 0 ? r : c.getResources().getIdentifier("ic3d_other", "drawable", c.getPackageName());
    }

    static String rel(Context c, long ms) {
        long mn = Math.max(1, (ms + 59999) / 60000);
        String pre = c.getString(R.string.w_pre);
        if (mn < 60) return pre + " " + mn + " min";
        long h = mn / 60, r = mn % 60;
        return pre + " " + h + " h" + (r >= 5 ? " " + r + " min" : "");
    }

    static String cap(String s) { return s.isEmpty() ? s : s.substring(0, 1).toUpperCase() + s.substring(1); }

    static String dropsWord(Context c, int n) {
        if ("pl".equals(Locale.getDefault().getLanguage())) {
            if (n == 1) return "drop";
            int a = n % 10, b = n % 100;
            return a >= 2 && a <= 4 && !(b >= 12 && b <= 14) ? "dropy" : "dropów";
        }
        return n == 1 ? "drop" : "drops";
    }

    static boolean sameDay(long a, long b) {
        Calendar x = Calendar.getInstance(), y = Calendar.getInstance();
        x.setTimeInMillis(a); y.setTimeInMillis(b);
        return x.get(Calendar.YEAR) == y.get(Calendar.YEAR) && x.get(Calendar.DAY_OF_YEAR) == y.get(Calendar.DAY_OF_YEAR);
    }

    static void draw(Context c, AppWidgetManager m, int id, int mode) {
        RemoteViews v = new RemoteViews(c.getPackageName(), mode == 0 ? R.layout.squad_widget : R.layout.squad_widget_m);
        Bundle o = m.getAppWidgetOptions(id);
        int wd = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0), hd = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (wd < 60) wd = mode == 0 ? 110 : 250;
        if (hd < 60) hd = mode == 0 ? 110 : 130;
        JSONArray arr = new JSONArray();
        try { arr = new JSONArray(c.getSharedPreferences("squad_widget", Context.MODE_PRIVATE).getString("drops", "[]")); } catch (Exception e) { }
        long now = System.currentTimeMillis();
        java.util.ArrayList<JSONObject> L = new java.util.ArrayList<>();
        for (int i = 0; i < arr.length(); i++) { JSONObject d = arr.optJSONObject(i); if (d != null && d.optLong("ts") + 2 * 3600000L > now) L.add(d); }
        JSONObject f = L.isEmpty() ? null : L.get(0);
        v.setImageViewBitmap(R.id.bg, bg(c, wd, hd, 0, 0, mode == 0));
        v.setOnClickPendingIntent(R.id.root, open(c, f == null ? "/new" : "/d/" + f.optString("id"), id * 10));
        v.setOnClickPendingIntent(R.id.btnNew, open(c, "/new", id * 10 + 7));
        long ts = f == null ? 0 : f.optLong("ts");
        boolean live = f != null && ts <= now, soon = f != null && !live && ts - now < 24 * 3600000L;
        if (mode == 0) {
            v.setTextViewText(R.id.kind, "DROP");
            if (f == null) {
                v.setTextViewText(R.id.when, "+");
                v.setTextViewText(R.id.title, c.getString(R.string.w_none));
                v.setTextViewText(R.id.rel, c.getString(R.string.w_none_hint));
            } else {
                v.setTextViewText(R.id.when, live ? c.getString(R.string.w_live) : new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(ts)));
                v.setTextViewText(R.id.title, f.optString("t"));
                v.setTextViewText(R.id.rel, live ? c.getString(R.string.w_now) : soon ? rel(c, ts - now) : day(c, ts));
            }
            float dn = c.getResources().getDisplayMetrics().density, side = Math.min(wd, hd);
            int ph = Math.max(0, Math.round(((wd - side) / 2f) * dn)), pv = Math.max(0, Math.round(((hd - side) / 2f) * dn));
            v.setViewPadding(R.id.card, ph + Math.round(14 * dn), pv + Math.round(14 * dn), ph + Math.round(14 * dn), pv + Math.round(14 * dn));
        } else {
            int today = 0;
            for (JSONObject d : L) if (sameDay(now, d.optLong("ts"))) today++;
            v.setTextViewText(R.id.kind, c.getString(R.string.w_today_up));
            v.setTextViewText(R.id.cnt, String.valueOf(today));
            v.setTextViewText(R.id.cw1, dropsWord(c, today));
            v.setTextViewText(R.id.cw2, c.getString(R.string.w_around));
            if (f == null) {
                v.setTextViewText(R.id.pill, "+");
                v.setTextViewText(R.id.title, c.getString(R.string.w_none));
                v.setTextViewText(R.id.place, c.getString(R.string.w_none_hint));
                v.setViewVisibility(R.id.going, View.GONE);
            } else {
                v.setTextViewText(R.id.pill, live ? c.getString(R.string.w_now) : soon ? cap(rel(c, ts - now)) : day(c, ts));
                v.setTextViewText(R.id.title, f.optString("t"));
                String pl = f.optString("pl");
                v.setTextViewText(R.id.place, pl);
                v.setViewVisibility(R.id.place, pl.isEmpty() ? View.GONE : View.VISIBLE);
                int n = f.optInt("n", 0);
                v.setViewVisibility(R.id.going, n > 0 ? View.VISIBLE : View.GONE);
                v.setViewVisibility(R.id.a2, n > 1 ? View.VISIBLE : View.GONE);
                v.setViewVisibility(R.id.a3, n > 2 ? View.VISIBLE : View.GONE);
                v.setTextViewText(R.id.gtx, n + " " + c.getString(R.string.w_going));
                v.setOnClickPendingIntent(R.id.card, open(c, "/d/" + f.optString("id"), id * 10 + 1));
            }
        }
        m.updateAppWidget(id, v);
        // odliczanie "za X min" odświeżamy co kilka minut, gdy start jest blisko
        try {
            android.app.AlarmManager am = (android.app.AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            Class<?> k = mode == 0 ? SquadWidgetProvider.class : SquadWidgetMedium.class;
            Intent i = new Intent(c, k);
            i.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, new int[]{id});
            PendingIntent pi = PendingIntent.getBroadcast(c, 900 + id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (am != null && f != null && !live && ts - now < 24 * 3600000L) am.set(android.app.AlarmManager.RTC, now + (ts - now < 3600000L ? 60000L : 10 * 60000L), pi);
            else if (am != null) am.cancel(pi);
        } catch (Exception e) { }
    }
}
