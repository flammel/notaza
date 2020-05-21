<?php

ini_set("display_errors", 1);
ini_set("display_startup_errors", 1);
error_reporting(E_ALL);

require_once "../vendor/autoload.php";
require_once "../config.php";

use Flammel\Notaza\Notaza;
use Flammel\Notaza\File;

set_error_handler(function ($code, $description) {
    throw new Exception("Caught by error handler: " . $code . " " . $description);
});

header("Access-Control-Allow-Origin: " . CORS_ORIGIN);
header("Access-Control-Allow-Methods: GET,PUT");
header("Access-Control-Allow-Headers: Content-Type");

$url = $_SERVER["REQUEST_URI"];
$method = $_SERVER["REQUEST_METHOD"];
$notaza = new Notaza(CONTENT_DIR);
if ($url === "/api/pages" && $method === "GET") {
    echo json_encode([
        "success" => true,
        "data" => $notaza->getAllFiles(),
    ]);
} elseif ($url === "/api/pages" && $method === "PUT") {
    $payload = json_decode(file_get_contents("php://input"), true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Invalid payload"
        ]);
        return;
    }

    if (!isset($payload["markdown"])) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "No markdown in payload"
        ]);
        return;
    }

    if (!isset($payload["id"])) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "No ID in payload"
        ]);
        return;
    }

    if (strpos($payload["id"], "/") !== false || strpos($payload["id"], ".") !== false) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Invalid ID"
        ]);
        return;
    }

    $updated = $notaza->update(new File($payload["id"], $payload["markdown"]));
    echo json_encode([
        "success" => true,
        "data" => $updated
    ]);
} elseif ($url === "/api/backlinks" && $method === "POST") {
    $notaza->refreshBacklinks();
    echo json_encode([
        "success" => true,
    ]);
} elseif ($method === "OPTIONS") {
    // Do nothing, needed for CORS
} else {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "error" => "Not found"
    ]);
}
