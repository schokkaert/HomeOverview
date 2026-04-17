<?php
declare(strict_types=1);

$date = $_GET['date'] ?? date('Y-m-d');
$format = $_GET['format'] ?? 'json';

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Invalid date']);
    exit;
}

$urls = [
    'json' => "https://www.digisteps.be/engie/downloads.php?action=sonoff_json&date={$date}",
    'csv' => "https://www.digisteps.be/engie/out/history/engie_{$date}.csv",
];

if (!isset($urls[$format])) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Invalid format']);
    exit;
}

$body = fetch_remote($urls[$format], true);

if ($body === false) {
    $body = fetch_remote($urls[$format], false);
}

if ($body === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Dagfile niet bereikbaar']);
    exit;
}

header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');
header($format === 'json' ? 'Content-Type: application/json; charset=utf-8' : 'Content-Type: text/csv; charset=utf-8');
echo $body;

function fetch_remote(string $url, bool $verifyTls): string|false
{
    $context = stream_context_create([
        'http' => [
            'timeout' => 8,
            'user_agent' => 'HomeOverview/1.0',
        ],
        'ssl' => [
            'verify_peer' => $verifyTls,
            'verify_peer_name' => $verifyTls,
        ],
    ]);

    return @file_get_contents($url, false, $context);
}
