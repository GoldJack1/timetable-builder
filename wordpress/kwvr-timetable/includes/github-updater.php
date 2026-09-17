<?php

if (!defined("ABSPATH")) {
    exit();
}

define("KWVR_TT_GITHUB_REPO", "GoldJack1/timetable-builder");

add_filter("pre_set_site_transient_update_plugins", "kwvr_tt_github_check_update");
add_filter("plugins_api", "kwvr_tt_github_plugin_info", 10, 3);
add_filter("auto_update_plugin", "kwvr_tt_github_auto_update", 10, 2);
add_filter("http_request_args", "kwvr_tt_github_http_args", 10, 2);

function kwvr_tt_plugin_basename()
{
    return plugin_basename(KWVR_TT_DIR . "kwvr-timetable.php");
}

function kwvr_tt_github_http_args($args, $url)
{
    if (strpos($url, "api.github.com") === false && strpos($url, "github.com/" . KWVR_TT_GITHUB_REPO . "/releases") === false) {
        return $args;
    }
    $token = get_option("kwvr_tt_github_token", "");
    if ($token) {
        $args["headers"]["Authorization"] = "Bearer " . $token;
    }
    $args["headers"]["User-Agent"] = "kwvr-timetable";
    $args["headers"]["Accept"] = "application/vnd.github+json";
    return $args;
}

function kwvr_tt_github_latest_release()
{
    $cached = get_transient("kwvr_tt_github_release");
    if (is_array($cached)) {
        return $cached;
    }
    $url = "https://api.github.com/repos/" . KWVR_TT_GITHUB_REPO . "/releases/latest";
    $res = wp_remote_get($url, ["timeout" => 12]);
    if (is_wp_error($res) || wp_remote_retrieve_response_code($res) !== 200) {
        return null;
    }
    $body = json_decode(wp_remote_retrieve_body($res), true);
    if (!is_array($body) || empty($body["tag_name"])) {
        return null;
    }
    $zip = "";
    foreach ($body["assets"] ?? [] as $asset) {
        if (($asset["name"] ?? "") === "kwvr-timetable.zip") {
            $zip = $asset["browser_download_url"] ?? "";
            break;
        }
    }
    $release = [
        "version" => ltrim((string) $body["tag_name"], "v"),
        "url" => $body["html_url"] ?? "https://github.com/" . KWVR_TT_GITHUB_REPO,
        "zip" => $zip,
        "notes" => wp_strip_all_tags((string) ($body["body"] ?? "")),
    ];
    set_transient("kwvr_tt_github_release", $release, 6 * HOUR_IN_SECONDS);
    return $release;
}

function kwvr_tt_github_check_update($transient)
{
    if (!is_object($transient) || empty($transient->checked)) {
        return $transient;
    }
    $release = kwvr_tt_github_latest_release();
    if (!$release || !$release["zip"]) {
        return $transient;
    }
    if (version_compare($release["version"], KWVR_TT_VERSION, "<=")) {
        return $transient;
    }
    $plugin = kwvr_tt_plugin_basename();
    $transient->response[$plugin] = (object) [
        "slug" => "kwvr-timetable",
        "plugin" => $plugin,
        "new_version" => $release["version"],
        "url" => $release["url"],
        "package" => $release["zip"],
        "icons" => [],
    ];
    return $transient;
}

function kwvr_tt_github_plugin_info($result, $action, $args)
{
    if ($action !== "plugin_information" || empty($args->slug) || $args->slug !== "kwvr-timetable") {
        return $result;
    }
    $release = kwvr_tt_github_latest_release();
    if (!$release) {
        return $result;
    }
    return (object) [
        "name" => "KWVR Timetable",
        "slug" => "kwvr-timetable",
        "version" => $release["version"],
        "author" => "KWVR",
        "homepage" => $release["url"],
        "download_link" => $release["zip"],
        "sections" => [
            "description" => "Heritage timetable month grid. Updates come from the GitHub repo " . KWVR_TT_GITHUB_REPO . ".",
            "changelog" => $release["notes"] ?: "See GitHub releases.",
        ],
    ];
}

function kwvr_tt_github_auto_update($update, $item)
{
    if (get_option("kwvr_tt_auto_update", "1") !== "1") {
        return $update;
    }
    $plugin = kwvr_tt_plugin_basename();
    if (!empty($item->plugin) && $item->plugin === $plugin) {
        return true;
    }
    if (!empty($item->slug) && $item->slug === "kwvr-timetable") {
        return true;
    }
    return $update;
}
