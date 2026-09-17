<?php
/**
 * Plugin Name: KWVR Timetable
 * Description: Test WordPress shortcode: colour “what’s on” months. Click a day to open that day’s timetable in an overlay. Works on any WP install; no live site required.
 * Version: 1.5.4
 * Author: KWVR
 * Plugin URI: https://github.com/GoldJack1/timetable-builder
 */

if (!defined("ABSPATH")) {
    exit();
}

define("KWVR_TT_VERSION", "1.5.4");
define("KWVR_TT_DIR", plugin_dir_path(__FILE__));
define("KWVR_TT_URL", plugin_dir_url(__FILE__));

require_once KWVR_TT_DIR . "includes/github-updater.php";

add_action("admin_menu", function () {
    add_menu_page(
        "KWVR Timetable",
        "Timetable",
        "manage_options",
        "kwvr-timetable",
        "kwvr_tt_settings_page",
        "dashicons-calendar-alt",
        58
    );
});

add_filter("plugin_action_links_" . plugin_basename(__FILE__), function ($links) {
    $url = admin_url("admin.php?page=kwvr-timetable");
    array_unshift($links, '<a href="' . esc_url($url) . '">Settings</a>');
    return $links;
});

add_action("admin_init", function () {
    register_setting("kwvr_tt", "kwvr_tt_json_url", ["type" => "string", "sanitize_callback" => "esc_url_raw"]);
    register_setting("kwvr_tt", "kwvr_tt_icon_base", ["type" => "string", "sanitize_callback" => "esc_url_raw"]);
    register_setting("kwvr_tt", "kwvr_tt_github_token", [
        "type" => "string",
        "sanitize_callback" => "sanitize_text_field",
    ]);
    register_setting("kwvr_tt", "kwvr_tt_fetch_github", [
        "type" => "string",
        "sanitize_callback" => function ($v) {
            return $v === "1" || $v === 1 || $v === true ? "1" : "0";
        },
    ]);
    register_setting("kwvr_tt", "kwvr_tt_auto_update", [
        "type" => "string",
        "sanitize_callback" => function ($v) {
            return $v === "1" || $v === 1 || $v === true ? "1" : "0";
        },
    ]);
    register_setting("kwvr_tt", "kwvr_tt_style", [
        "type" => "array",
        "sanitize_callback" => "kwvr_tt_sanitize_style",
        "default" => kwvr_tt_default_style(),
    ]);
});

function kwvr_tt_default_style()
{
    return [
        "calendar_size" => "xlarge",
        "calendar_width" => "full",
        "day_shape" => "soft",
        "day_gap" => "8",
        "event_text" => "small",
        "event_lines" => "1",
        "button_style" => "light",
        "button_shape" => "soft",
        "overlay_style" => "dark",
        "overlay_shape" => "soft",
        "overlay_width" => "default",
    ];
}

function kwvr_tt_get_style()
{
    $saved = get_option("kwvr_tt_style", []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return array_merge(kwvr_tt_default_style(), array_intersect_key($saved, kwvr_tt_default_style()));
}

function kwvr_tt_pick($value, $allowed, $fallback)
{
    return in_array($value, $allowed, true) ? $value : $fallback;
}

function kwvr_tt_sanitize_style($input)
{
    $d = kwvr_tt_default_style();
    if (!is_array($input)) {
        return $d;
    }
    return [
        "calendar_size" => kwvr_tt_pick($input["calendar_size"] ?? "", ["compact", "default", "large", "xlarge"], $d["calendar_size"]),
        "calendar_width" => kwvr_tt_pick($input["calendar_width"] ?? "", ["full", "wide", "contained"], $d["calendar_width"]),
        "day_shape" => kwvr_tt_pick($input["day_shape"] ?? "", ["square", "soft", "round"], $d["day_shape"]),
        "day_gap" => kwvr_tt_pick((string) ($input["day_gap"] ?? ""), ["4", "8", "12", "16"], $d["day_gap"]),
        "event_text" => kwvr_tt_pick($input["event_text"] ?? "", ["small", "medium", "large"], $d["event_text"]),
        "event_lines" => kwvr_tt_pick((string) ($input["event_lines"] ?? ""), ["1", "2", "3"], $d["event_lines"]),
        "button_style" => kwvr_tt_pick($input["button_style"] ?? "", ["light", "dark", "outline"], $d["button_style"]),
        "button_shape" => kwvr_tt_pick($input["button_shape"] ?? "", ["square", "soft", "pill"], $d["button_shape"]),
        "overlay_style" => kwvr_tt_pick($input["overlay_style"] ?? "", ["light", "dark", "darker"], $d["overlay_style"]),
        "overlay_shape" => kwvr_tt_pick($input["overlay_shape"] ?? "", ["square", "soft", "round"], $d["overlay_shape"]),
        "overlay_width" => kwvr_tt_pick($input["overlay_width"] ?? "", ["narrow", "default", "wide"], $d["overlay_width"]),
    ];
}

function kwvr_tt_style_css($style)
{
    $widths = ["compact" => "720px", "default" => "960px", "large" => "1180px", "xlarge" => "1400px"];
    $cal_max = $widths[$style["calendar_size"]] ?? $widths["xlarge"];
    if (($style["calendar_width"] ?? "full") === "full") {
        $cal_max = "100%";
    } elseif (($style["calendar_width"] ?? "") === "wide") {
        $cal_max = "min(1100px, 100%)";
    }
    $day_r = ["square" => "0px", "soft" => "10px", "round" => "18px"];
    $btn_r = ["square" => "0px", "soft" => "8px", "pill" => "999px"];
    $ov_r = ["square" => "0px", "soft" => "12px", "round" => "22px"];
    $ov_w = ["narrow" => "720px", "default" => "960px", "wide" => "1180px"];
    $ev = ["small" => "8px", "medium" => "9px", "large" => "11px"];
    $btn = [
        "light" => ["#ffffff", "#111111", "#d0d0d0"],
        "dark" => ["#111111", "#ffffff", "#111111"],
        "outline" => ["transparent", "#111111", "#111111"],
    ];
    $scrim = ["light" => "rgba(17,17,17,0.28)", "dark" => "rgba(17,17,17,0.55)", "darker" => "rgba(17,17,17,0.78)"];
    $b = $btn[$style["button_style"]] ?? $btn["light"];
    $vars = [
        "--kwvr-cal-max" => $cal_max,
        "--kwvr-day-gap" => $style["day_gap"] . "px",
        "--kwvr-day-radius" => $day_r[$style["day_shape"]] ?? "10px",
        "--kwvr-event-size" => $ev[$style["event_text"]] ?? "12px",
        "--kwvr-event-lines" => $style["event_lines"],
        "--kwvr-btn-bg" => $b[0],
        "--kwvr-btn-fg" => $b[1],
        "--kwvr-btn-border" => $b[2],
        "--kwvr-btn-radius" => $btn_r[$style["button_shape"]] ?? "8px",
        "--kwvr-overlay-scrim" => $scrim[$style["overlay_style"]] ?? $scrim["dark"],
        "--kwvr-overlay-radius" => $ov_r[$style["overlay_shape"]] ?? "12px",
        "--kwvr-overlay-max" => $ov_w[$style["overlay_width"]] ?? "960px",
    ];
    $out = [];
    foreach ($vars as $k => $v) {
        $out[] = $k . ":" . $v;
    }
    return implode(";", $out);
}

function kwvr_tt_style_select($name, $current, $choices)
{
    echo '<select id="kwvr_tt_style_' . esc_attr($name) . '" name="kwvr_tt_style[' . esc_attr($name) . ']">';
    foreach ($choices as $value => $label) {
        echo '<option value="' . esc_attr($value) . '"' . selected($current, $value, false) . ">" . esc_html($label) . "</option>";
    }
    echo "</select>";
}

add_filter("upload_mimes", function ($mimes) {
    $mimes["json"] = "application/json";
    return $mimes;
});

add_shortcode("kwvr_timetable", "kwvr_tt_shortcode");

function kwvr_tt_settings_page()
{
    if (!current_user_can("manage_options")) {
        return;
    }
    ?>
    <div class="wrap">
      <h1>KWVR Timetable</h1>
      <p>Put <code>[kwvr_timetable]</code> on any page. The public calendar is that page, not this screen. Use this page to fetch the latest timetable from GitHub, control plugin updates, and style the calendar.</p>
      <form method="post" action="options.php">
        <?php
        settings_fields("kwvr_tt");
        $style = kwvr_tt_get_style();
        ?>
        <table class="form-table">
          <tr>
            <th><label for="kwvr_tt_json_url">Optional JSON URL</label></th>
            <td>
              <input class="regular-text" type="url" id="kwvr_tt_json_url" name="kwvr_tt_json_url" value="<?php echo esc_attr(get_option("kwvr_tt_json_url", "")); ?>" />
              <p class="description">Leave blank to fetch the timetable from GitHub (<code>wordpress/kwvr-timetable/sample/timetable.json</code> on <code>main</code>). A Media URL here overrides GitHub.</p>
            </td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_icon_base">Optional icon folder URL</label></th>
            <td>
              <input class="regular-text" type="url" id="kwvr_tt_icon_base" name="kwvr_tt_icon_base" value="<?php echo esc_attr(get_option("kwvr_tt_icon_base", "")); ?>" />
              <p class="description">Leave blank to use icons shipped with the plugin.</p>
            </td>
          </tr>
          <tr>
            <th>Timetable from GitHub</th>
            <td>
              <label>
                <input type="hidden" name="kwvr_tt_fetch_github" value="0" />
                <input type="checkbox" name="kwvr_tt_fetch_github" value="1" <?php checked(get_option("kwvr_tt_fetch_github", "1"), "1"); ?> />
                Load the live calendar JSON from the GitHub repo (cached for 5 minutes)
              </label>
              <p>
                <a class="button" href="<?php echo esc_url(wp_nonce_url(admin_url("admin-post.php?action=kwvr_tt_refresh_json"), "kwvr_tt_refresh_json")); ?>">Fetch timetable now</a>
              </p>
            </td>
          </tr>
          <tr>
            <th>Plugin from GitHub</th>
            <td>
              <label>
                <input type="hidden" name="kwvr_tt_auto_update" value="0" />
                <input type="checkbox" name="kwvr_tt_auto_update" value="1" <?php checked(get_option("kwvr_tt_auto_update", "1"), "1"); ?> />
                Install new plugin versions from GitHub automatically
              </label>
              <p class="description">After you push a version bump to <code>GoldJack1/timetable-builder</code>, GitHub builds a zip. WordPress then updates this plugin from Dashboard → Updates (or on its own if this box is ticked).</p>
            </td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_github_token">GitHub token (private repo only)</label></th>
            <td>
              <input class="regular-text" type="password" id="kwvr_tt_github_token" name="kwvr_tt_github_token" value="<?php echo esc_attr(get_option("kwvr_tt_github_token", "")); ?>" autocomplete="off" />
              <p class="description">Leave blank if the GitHub repo is public. If it is private, create a token with <code>repo</code> access and paste it here.</p>
            </td>
          </tr>
        </table>
        <h2>Calendar look</h2>
        <p class="description">Day boxes stay square on every screen size. These controls change how large they are and how buttons and the timetable overlay look.</p>
        <table class="form-table">
          <tr>
            <th><label for="kwvr_tt_style_calendar_width">Calendar width</label></th>
            <td>
              <?php kwvr_tt_style_select("calendar_width", $style["calendar_width"], ["full" => "Fill the content column", "wide" => "Wide", "contained" => "Narrow box"]); ?>
              <p class="description">Stays inside the theme’s boxed layout and page margins. Use <code>[kwvr_timetable width="full"]</code> (default), <code>wide</code>, or <code>contained</code>.</p>
            </td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_calendar_size">Calendar size</label></th>
            <td>
              <?php kwvr_tt_style_select("calendar_size", $style["calendar_size"], ["compact" => "Compact", "default" => "Medium", "large" => "Large", "xlarge" => "Extra large"]); ?>
              <p class="description">Larger calendars make the square day boxes bigger so event titles are easier to read.</p>
            </td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_day_shape">Day corners</label></th>
            <td><?php kwvr_tt_style_select("day_shape", $style["day_shape"], ["square" => "Sharp square", "soft" => "Soft square", "round" => "Rounded square"]); ?></td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_day_gap">Gap between days</label></th>
            <td><?php kwvr_tt_style_select("day_gap", $style["day_gap"], ["4" => "Tight", "8" => "Normal", "12" => "Roomy", "16" => "Wide"]); ?></td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_event_text">Event text</label></th>
            <td><?php kwvr_tt_style_select("event_text", $style["event_text"], ["small" => "Small", "medium" => "Medium", "large" => "Large"]); ?></td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_event_lines">Event lines</label></th>
            <td><?php kwvr_tt_style_select("event_lines", $style["event_lines"], ["1" => "1 line", "2" => "2 lines", "3" => "3 lines"]); ?></td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_button_style">Month buttons</label></th>
            <td><?php kwvr_tt_style_select("button_style", $style["button_style"], ["light" => "Light", "dark" => "Dark", "outline" => "Outline"]); ?></td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_button_shape">Button shape</label></th>
            <td><?php kwvr_tt_style_select("button_shape", $style["button_shape"], ["square" => "Square", "soft" => "Soft", "pill" => "Pill"]); ?></td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_overlay_style">Overlay backdrop</label></th>
            <td><?php kwvr_tt_style_select("overlay_style", $style["overlay_style"], ["light" => "Light dim", "dark" => "Dark dim", "darker" => "Very dark"]); ?></td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_overlay_shape">Overlay corners</label></th>
            <td><?php kwvr_tt_style_select("overlay_shape", $style["overlay_shape"], ["square" => "Square", "soft" => "Soft", "round" => "Rounded"]); ?></td>
          </tr>
          <tr>
            <th><label for="kwvr_tt_style_overlay_width">Overlay width</label></th>
            <td><?php kwvr_tt_style_select("overlay_width", $style["overlay_width"], ["narrow" => "Narrow", "default" => "Default", "wide" => "Wide"]); ?></td>
          </tr>
        </table>
        <?php submit_button(); ?>
      </form>
      <p>Shortcode: <code>[kwvr_timetable]</code> or <code>[kwvr_timetable width="full"]</code></p>
    </div>
    <?php
}

add_action("admin_post_kwvr_tt_refresh_json", function () {
    if (!current_user_can("manage_options") || !wp_verify_nonce($_GET["_wpnonce"] ?? "", "kwvr_tt_refresh_json")) {
        wp_die("Not allowed.");
    }
    kwvr_tt_clear_github_json_cache();
    $doc = kwvr_tt_load_github_json();
    $ok = !is_wp_error($doc);
    wp_safe_redirect(
        add_query_arg("kwvr_tt_refresh", $ok ? "1" : "0", admin_url("admin.php?page=kwvr-timetable"))
    );
    exit();
});

add_action("admin_notices", function () {
    if (!isset($_GET["page"]) || $_GET["page"] !== "kwvr-timetable" || !isset($_GET["kwvr_tt_refresh"])) {
        return;
    }
    if ($_GET["kwvr_tt_refresh"] === "1") {
        echo '<div class="notice notice-success is-dismissible"><p>Timetable JSON loaded from GitHub.</p></div>';
    } else {
        echo '<div class="notice notice-error is-dismissible"><p>Could not load timetable JSON from GitHub. Check the repo path and token.</p></div>';
    }
});

function kwvr_tt_shortcode($atts)
{
    $atts = shortcode_atts(
        [
            "json" => get_option("kwvr_tt_json_url", ""),
            "icons" => get_option("kwvr_tt_icon_base", "") ?: KWVR_TT_URL . "icons/",
            "view" => "months",
            "width" => "",
        ],
        $atts,
        "kwvr_timetable"
    );

    wp_enqueue_style("kwvr-timetable", KWVR_TT_URL . "assets/timetable.css", [], KWVR_TT_VERSION);
    wp_enqueue_script("kwvr-timetable", KWVR_TT_URL . "assets/timetable.js", [], KWVR_TT_VERSION, true);

    $json_url = esc_url_raw($atts["json"]);
    if ($json_url) {
        $doc = kwvr_tt_load_json($json_url);
    } elseif (get_option("kwvr_tt_fetch_github", "1") === "1") {
        $doc = kwvr_tt_load_github_json();
        if (is_wp_error($doc)) {
            $doc = kwvr_tt_load_sample();
        }
    } else {
        $doc = kwvr_tt_load_sample();
    }
    if (is_wp_error($doc)) {
        return '<p class="kwvr-tt-err">' . esc_html($doc->get_error_message()) . "</p>";
    }

    return kwvr_tt_render($doc, [
        "icons" => esc_url_raw($atts["icons"]),
        "view" => $atts["view"] === "dates" ? "dates" : "months",
        "width" => strtolower(trim((string) $atts["width"])),
    ]);
}

function kwvr_tt_load_sample()
{
    $path = KWVR_TT_DIR . "sample/timetable.json";
    if (!is_readable($path)) {
        return new WP_Error("kwvr_tt_sample", "Bundled sample timetable is missing.");
    }
    $doc = json_decode((string) file_get_contents($path), true);
    if (!is_array($doc) || empty($doc["calendar"]) || empty($doc["palette"])) {
        return new WP_Error("kwvr_tt_json", "Timetable JSON is invalid.");
    }
    return $doc;
}

function kwvr_tt_load_json($url)
{
    $path = kwvr_tt_local_path($url);
    if ($path && is_readable($path)) {
        $body = file_get_contents($path);
    } else {
        $res = wp_remote_get($url, ["timeout" => 15]);
        if (is_wp_error($res)) {
            return $res;
        }
        $code = wp_remote_retrieve_response_code($res);
        if ($code < 200 || $code >= 300) {
            return new WP_Error("kwvr_tt_http", "Could not load timetable JSON.");
        }
        $body = wp_remote_retrieve_body($res);
    }
    $doc = json_decode($body, true);
    if (!is_array($doc) || empty($doc["calendar"]) || empty($doc["palette"])) {
        return new WP_Error("kwvr_tt_json", "Timetable JSON is invalid.");
    }
    return $doc;
}

function kwvr_tt_local_path($url)
{
    $uploads = wp_upload_dir();
    $base = trailingslashit($uploads["baseurl"]);
    if (strpos($url, $base) !== 0) {
        return "";
    }
    return trailingslashit($uploads["basedir"]) . substr($url, strlen($base));
}

function kwvr_tt_hex($s)
{
    $s = is_string($s) ? trim($s) : "";
    if (preg_match('/^#?[0-9a-fA-F]{3,8}$/', $s)) {
        return $s[0] === "#" ? $s : "#" . $s;
    }
    return "#333333";
}

function kwvr_tt_iso($year, $month_index, $day)
{
    return sprintf("%04d-%02d-%02d", $year, $month_index + 1, $day);
}

function kwvr_tt_days_in_month($year, $month_index)
{
    return (int) gmdate("t", gmmktime(0, 0, 0, $month_index + 1, 1, $year));
}

function kwvr_tt_monday_index($year, $month_index, $day)
{
    $js = (int) gmdate("w", gmmktime(0, 0, 0, $month_index + 1, $day, $year));
    return ($js + 6) % 7;
}

function kwvr_tt_add_months($year, $month_index, $delta)
{
    $t = $year * 12 + $month_index + $delta;
    $year = intdiv($t, 12);
    $month_index = (($t % 12) + 12) % 12;
    return [$year, $month_index];
}

function kwvr_tt_month_slots($year, $month_index, $cells)
{
    $dim = kwvr_tt_days_in_month($year, $month_index);
    $lead = kwvr_tt_monday_index($year, $month_index, 1);
    [$py, $pm] = kwvr_tt_add_months($year, $month_index, -1);
    $prev_dim = kwvr_tt_days_in_month($py, $pm);
    [$ny, $nm] = kwvr_tt_add_months($year, $month_index, 1);
    $slots = [];
    for ($i = 0; $i < $lead; $i++) {
        $day = $prev_dim - $lead + 1 + $i;
        $iso = kwvr_tt_iso($py, $pm, $day);
        $slots[] = ["day" => $day, "iso" => $iso, "letter" => $cells[$iso] ?? "", "outside" => true];
    }
    for ($d = 1; $d <= $dim; $d++) {
        $iso = kwvr_tt_iso($year, $month_index, $d);
        $slots[] = ["day" => $d, "iso" => $iso, "letter" => $cells[$iso] ?? "", "outside" => false];
    }
    $next_day = 1;
    while (count($slots) % 7 !== 0) {
        $iso = kwvr_tt_iso($ny, $nm, $next_day);
        $slots[] = ["day" => $next_day, "iso" => $iso, "letter" => $cells[$iso] ?? "", "outside" => true];
        $next_day++;
    }
    return $slots;
}

function kwvr_tt_months($doc)
{
    $start = $doc["calendar"]["startMonth"] ?? "";
    $count = max(1, (int) ($doc["calendar"]["monthCount"] ?? 1));
    $parts = array_map("intval", explode("-", $start));
    $year = $parts[0] ?? (int) gmdate("Y");
    $month_index = max(0, ($parts[1] ?? 1) - 1);
    $names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    $out = [];
    for ($i = 0; $i < $count; $i++) {
        [$y, $m] = kwvr_tt_add_months($year, $month_index, $i);
        $out[] = ["id" => sprintf("%04d-%02d", $y, $m + 1), "label" => $names[$m], "year" => $y, "monthIndex" => $m];
    }
    return $out;
}

function kwvr_tt_palette($doc, $letter)
{
    foreach ($doc["palette"] as $p) {
        if (($p["letter"] ?? "") === $letter) {
            return $p;
        }
    }
    return null;
}

function kwvr_tt_css_fill($hex, $opacity)
{
    $o = max(0, min(100, (int) $opacity));
    if ($o >= 100) {
        return $hex;
    }
    return sprintf("color-mix(in srgb, %s %d%%, transparent)", $hex, $o);
}

function kwvr_tt_tint($hex)
{
    $raw = ltrim($hex, "#");
    if (strlen($raw) === 3) {
        $raw = $raw[0] . $raw[0] . $raw[1] . $raw[1] . $raw[2] . $raw[2];
    }
    $raw = str_pad(substr($raw, 0, 6), 6, "0");
    $n = hexdec($raw);
    $r = ($n >> 16) & 255;
    $g = ($n >> 8) & 255;
    $b = $n & 255;
    return sprintf("rgb(%d,%d,%d)", (int) round($r * 0.25 + 255 * 0.75), (int) round($g * 0.25 + 255 * 0.75), (int) round($b * 0.25 + 255 * 0.75));
}

function kwvr_tt_icon_html($ids, $base)
{
    if (!$base || !is_array($ids)) {
        return "";
    }
    $html = "";
    foreach ($ids as $id) {
        $id = preg_replace("/[^a-zA-Z0-9_]/", "", (string) $id);
        if ($id === "") {
            continue;
        }
        $src = trailingslashit($base) . $id . ".svg";
        $html .= '<img class="kwvr-icon" src="' . esc_url($src) . '" alt="" width="12" height="12" />';
    }
    return $html ? '<span class="icons">' . $html . "</span>" : "";
}

function kwvr_tt_station($doc, $id)
{
    foreach ($doc["stations"] as $s) {
        if (($s["id"] ?? "") === $id) {
            return $s;
        }
    }
    return ["id" => $id, "name" => $id, "iconIds" => []];
}

function kwvr_tt_render($doc, $opts)
{
    $cells = $doc["calendar"]["cells"] ?? [];
    $style = $doc["calendar"]["style"] ?? [];
    $non = kwvr_tt_hex($style["nonRunningFill"] ?? "#cccccc");
    $non_o = $style["nonRunningOpacity"] ?? 100;
    $other = kwvr_tt_hex($style["otherMonthsFill"] ?? "#cccccc");
    $other_o = $style["otherMonthsOpacity"] ?? 50;
    $icons = $opts["icons"];
    $names = [];
    foreach ($doc["palette"] as $p) {
        if (!empty($p["letter"])) {
            $names[$p["letter"]] = $p["name"] ?? "";
        }
    }

    $wp_events = kwvr_tt_wp_events();
    $json_events = is_array($doc["calendar"]["events"] ?? null) ? $doc["calendar"]["events"] : [];
    $events = kwvr_tt_merge_events($json_events, $wp_events);

    ob_start();
    $look = kwvr_tt_get_style();
    $width = kwvr_tt_pick($opts["width"] ?? "", ["full", "wide", "contained"], $look["calendar_width"] ?? "full");
    $page_class = "kwvr-tt-page kwvr-tt-width-" . $width;
    $look_css = $look;
    $look_css["calendar_width"] = $width;
    echo '<div class="' . esc_attr($page_class) . '"><div class="kwvr-tt-live sheet" style="' . esc_attr(kwvr_tt_style_css($look_css)) . '" data-kwvr-names="' . esc_attr(wp_json_encode($names)) . '">';

    if ($opts["view"] === "dates") {
        echo kwvr_tt_date_grid($doc, $cells);
    } else {
        echo '<nav class="kwvr-tt-month-nav" aria-label="Month">';
        echo '<button type="button" class="kwvr-tt-month-btn" data-kwvr-month-prev>Previous</button>';
        echo '<p class="kwvr-tt-month-title" data-kwvr-month-label></p>';
        echo '<button type="button" class="kwvr-tt-month-btn" data-kwvr-month-next>Next</button>';
        echo "</nav>";
        echo '<div class="month-wrap month-wrap-single">';
        $wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        foreach (kwvr_tt_months($doc) as $m) {
            echo '<div class="month-card" data-kwvr-month="' . esc_attr($m["id"]) . '" data-kwvr-month-title="' . esc_attr($m["label"] . " " . $m["year"]) . '" hidden>';
            echo "<h3 class='kwvr-tt-card-title'>" . esc_html($m["label"] . " " . $m["year"]) . "</h3>";
            echo '<div class="month-wd-row">';
            foreach ($wd as $w) {
                echo '<div class="month-wd"><span class="month-wd-full">' . esc_html($w) . '</span><span class="month-wd-short">' . esc_html($w[0]) . "</span></div>";
            }
            echo "</div><div class='month-grid'>";
            foreach (kwvr_tt_month_slots($m["year"], $m["monthIndex"], $cells) as $s) {
                $pal = $s["letter"] ? kwvr_tt_palette($doc, $s["letter"]) : null;
                $day_events = $pal ? $events[$s["iso"]] ?? [] : [];
                $cls = "month-day";
                if ($pal) {
                    $cls .= " has-letter";
                }
                if ($day_events) {
                    $cls .= " has-events";
                }
                if ($s["outside"]) {
                    $cls .= " outside";
                }
                $bg = "";
                $fg = "";
                if ($pal) {
                    $fill = kwvr_tt_hex($pal["fill"] ?? "#333");
                    $bg = $s["outside"] ? kwvr_tt_css_fill($fill, $other_o) : $fill;
                    $fg = kwvr_tt_hex($pal["text"] ?? "#fff");
                } elseif ($s["outside"]) {
                    $bg = kwvr_tt_css_fill($other, $other_o);
                } else {
                    $bg = kwvr_tt_css_fill($non, $non_o);
                }
                $style_attr = $bg ? ' style="background:' . esc_attr($bg) . ($fg ? ";color:" . esc_attr($fg) : "") . '"' : "";
                echo '<div class="' .
                    esc_attr($cls) .
                    '"' .
                    $style_attr .
                    ' data-kwvr-iso="' .
                    esc_attr($s["iso"]) .
                    '" data-kwvr-letter="' .
                    esc_attr($s["letter"]) .
                    '" role="button" tabindex="0">';
                echo '<span class="month-stack"><span class="month-head"><span class="month-num">' . esc_html((string) $s["day"]) . "</span>";
                if ($s["letter"]) {
                    echo '<span class="month-letter">' . esc_html($s["letter"]) . "</span>";
                }
                echo "</span>";
                if ($day_events) {
                    echo '<span class="month-events">';
                    foreach ($day_events as $ev) {
                        $title = (string) ($ev["title"] ?? "");
                        $url = (string) ($ev["url"] ?? "");
                        if ($title === "") {
                            continue;
                        }
                        echo '<a class="month-event" href="' . esc_url($url !== "" ? $url : "#") . '">' . esc_html($title) . "</a>";
                    }
                    echo "</span>";
                }
                echo "</span></div>";
            }
            echo "</div></div>";
        }
        echo "</div>";
    }

    echo '<div class="kwvr-tt-overlay" hidden>';
    echo '<div class="kwvr-tt-overlay-backdrop" data-kwvr-close></div>';
    echo '<div class="kwvr-tt-overlay-card" role="dialog" aria-modal="true" aria-labelledby="kwvr-tt-overlay-title">';
    echo '<button type="button" class="kwvr-tt-overlay-close" data-kwvr-close>Close</button>';
    echo '<p class="kwvr-tt-overlay-when" id="kwvr-tt-overlay-title"></p>';
    echo '<p class="kwvr-tt-overlay-empty" hidden>No trains on this day.</p>';
    echo '<div class="kwvr-embed-panels">';
    foreach ($doc["panels"] as $panel) {
        echo kwvr_tt_panel($doc, $panel, $icons);
    }
    echo "</div></div></div>";
    echo "</div></div>";
    return ob_get_clean();
}

function kwvr_tt_date_grid($doc, $cells)
{
    $html = '<div class="cal-grid" style="grid-template-columns:minmax(64px,max-content) repeat(31,24px)">';
    $html .= '<div class="cal-corner"></div>';
    for ($d = 1; $d <= 31; $d++) {
        $html .= '<div class="cal-sq cal-head">' . $d . "</div>";
    }
    foreach (kwvr_tt_months($doc) as $m) {
        $dim = kwvr_tt_days_in_month($m["year"], $m["monthIndex"]);
        $html .= '<div class="cal-month">' . esc_html($m["label"]) . "</div>";
        for ($d = 1; $d <= 31; $d++) {
            if ($d > $dim) {
                $html .= '<div class="cal-sq"></div>';
                continue;
            }
            $iso = kwvr_tt_iso($m["year"], $m["monthIndex"], $d);
            $letter = $cells[$iso] ?? "";
            $pal = $letter ? kwvr_tt_palette($doc, $letter) : null;
            $style = "";
            if ($pal) {
                $style =
                    ' style="background:' .
                    esc_attr(kwvr_tt_hex($pal["fill"] ?? "#333")) .
                    ";color:" .
                    esc_attr(kwvr_tt_hex($pal["text"] ?? "#fff")) .
                    '"';
            }
            $html .=
                '<button type="button" class="cal-sq' .
                ($letter ? " cal-cell" : "") .
                '"' .
                $style .
                ' data-kwvr-iso="' .
                esc_attr($iso) .
                '" data-kwvr-letter="' .
                esc_attr($letter) .
                '">' .
                esc_html($letter) .
                "</button>";
        }
    }
    $html .= "</div>";
    return $html;
}

function kwvr_tt_panel($doc, $panel, $icon_base)
{
    $letter = $panel["letter"] ?? "";
    $pal = kwvr_tt_palette($doc, $letter);
    $fill = kwvr_tt_hex($pal["fill"] ?? "#333");
    $text = kwvr_tt_hex($pal["text"] ?? "#fff");
    $name = strtoupper($pal["name"] ?? "");
    $html = '<article class="kwvr-panel-live panel stacked" data-kwvr-panel="' . esc_attr($letter) . '">';
    $html .= kwvr_tt_block($doc, $panel["outbound"] ?? [], $fill, $text, "{$letter} · {$name} TIMETABLE", false, $icon_base);
    $html .= kwvr_tt_block($doc, $panel["inbound"] ?? [], $fill, $text, "", true, $icon_base);
    $html .= "</article>";
    return $html;
}

function kwvr_tt_block($doc, $block, $fill, $text, $banner, $follow, $icon_base)
{
    $rows = $block["rows"] ?? [];
    $services = $block["services"] ?? [];
    $cols = 2 + count($services);
    $stripe = kwvr_tt_tint($fill);
    $notes_style = "background:" . esc_attr($fill) . ";color:" . esc_attr($text);
    $html = '<div class="panel-block"><table class="panel-table" style="border:2px solid ' . esc_attr($fill) . '">';
    $html .= '<colgroup><col class="name" /><col class="dir" />';
    foreach ($services as $s) {
        $html .= '<col class="time" />';
    }
    $html .= "</colgroup><tbody>";
    if ($banner) {
        $html .=
            '<tr class="panel-banner"><td colspan="' .
            (int) $cols .
            '" style="background:' .
            esc_attr($fill) .
            ";color:" .
            esc_attr($text) .
            '">' .
            esc_html($banner) .
            "</td></tr>";
    }
    $html .= '<tr class="notes-row' . ($follow ? " notes-row-follow" : "") . '">';
    $html .= '<td class="name" style="' . $notes_style . '"><span class="notes-label">Notes</span></td>';
    $html .= '<td style="' . $notes_style . '"></td>';
    foreach ($services as $s) {
        $html .= '<td class="time" style="' . $notes_style . '">' . kwvr_tt_icon_html($s["noteIconIds"] ?? [], $icon_base) . "</td>";
    }
    $html .= "</tr>";
    $i = 0;
    foreach ($rows as $row) {
        $bg = $i % 2 === 1 ? $stripe : "#ffffff";
        $st = "background:" . esc_attr($bg);
        $station = kwvr_tt_station($doc, $row["stationId"] ?? "");
        $html .= "<tr>";
        $html .= '<td class="name" style="' . $st . '">';
        if (empty($row["filler"])) {
            $html .=
                '<span class="station-cell">' .
                esc_html($station["name"] ?? "") .
                kwvr_tt_icon_html($station["iconIds"] ?? [], $icon_base) .
                "</span>";
        }
        $html .= "</td>";
        $html .= '<td class="dir" style="' . $st . '">' . esc_html($row["filler"] ? "" : ($row["dir"] ?? "")) . "</td>";
        foreach ($services as $s) {
            $cell = $s["times"][$row["stationId"] ?? ""] ?? null;
            $val = is_array($cell) ? ($cell["value"] ?? "") : "";
            $italic = is_array($cell) && ($cell["style"] ?? "") === "italic" ? " italic" : "";
            $html .= '<td class="time' . $italic . '" style="' . $st . '">' . esc_html($val) . "</td>";
        }
        $html .= "</tr>";
        $i++;
    }
    $html .= "</tbody></table></div>";
    return $html;
}

function kwvr_tt_merge_events($json_events, $wp_events)
{
    $out = [];
    foreach ([$json_events, $wp_events] as $source) {
        if (!is_array($source)) {
            continue;
        }
        foreach ($source as $iso => $list) {
            if (!is_array($list)) {
                continue;
            }
            foreach ($list as $ev) {
                $title = trim((string) ($ev["title"] ?? ""));
                $url = (string) ($ev["url"] ?? "");
                if ($title === "") {
                    continue;
                }
                $out[$iso][] = ["title" => $title, "url" => $url];
            }
        }
    }
    foreach ($out as $iso => $list) {
        $seen = [];
        $unique = [];
        foreach ($list as $ev) {
            $key = strtolower($ev["title"] . "\n" . $ev["url"]);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $unique[] = $ev;
        }
        $out[$iso] = $unique;
    }
    return $out;
}

function kwvr_tt_wp_events()
{
    $types = array_values(array_filter(["events", "tribe_events", "event"], "post_type_exists"));
    $types = apply_filters("kwvr_tt_event_post_types", $types);
    if (!$types) {
        return [];
    }
    $q = new WP_Query([
        "post_type" => $types,
        "post_status" => "publish",
        "posts_per_page" => 400,
        "no_found_rows" => true,
    ]);
    $map = [];
    foreach ($q->posts as $post) {
        foreach (kwvr_tt_post_event_isos($post->ID) as $iso) {
            $map[$iso][] = [
                "title" => get_the_title($post),
                "url" => get_permalink($post),
            ];
        }
    }
    return apply_filters("kwvr_tt_wp_events", $map);
}

function kwvr_tt_post_event_isos($post_id)
{
    $start_keys = ["fc_start", "fc_start_datetime", "rhc_start", "_EventStartDate", "event_start_date", "event_start"];
    $end_keys = ["fc_end", "fc_end_datetime", "rhc_end", "_EventEndDate", "event_end_date"];
    $start = "";
    foreach ($start_keys as $key) {
        $value = get_post_meta($post_id, $key, true);
        if (is_string($value) && preg_match("/(\d{4}-\d{2}-\d{2})/", $value, $m)) {
            $start = $m[1];
            break;
        }
    }
    if ($start === "") {
        return [];
    }
    $end = $start;
    foreach ($end_keys as $key) {
        $value = get_post_meta($post_id, $key, true);
        if (is_string($value) && preg_match("/(\d{4}-\d{2}-\d{2})/", $value, $m)) {
            $end = $m[1];
            break;
        }
    }
    $from = strtotime($start . " UTC");
    $to = strtotime($end . " UTC");
    if ($from === false) {
        return [];
    }
    if ($to === false || $to < $from) {
        $to = $from;
    }
    $days = min(14, (int) (($to - $from) / 86400) + 1);
    $out = [];
    for ($i = 0; $i < $days; $i++) {
        $out[] = gmdate("Y-m-d", $from + $i * 86400);
    }
    return $out;
}
