<?php

ini_set("display_errors", 1);
ini_set("display_startup_errors", 1);
error_reporting(E_ALL);

require_once "../vendor/autoload.php";
require_once "../config.php";

set_error_handler(function($code, $description) {
    throw new Exception("Caught by error handler: " . $description);
});

$url = $_SERVER["REQUEST_URI"];
$method = $_SERVER["REQUEST_METHOD"];

header("Access-Control-Allow-Origin: " . CORS_ORIGIN);
header("Access-Control-Allow-Methods: GET,PUT");
header("Access-Control-Allow-Headers: Content-Type");

use League\CommonMark\DocParser;
use League\CommonMark\Environment;
use League\CommonMark\HtmlRenderer;
use League\CommonMark\Inline\Element\Link;
use League\CommonMark\Inline\Element\HtmlInline;
use League\CommonMark\Node\Node;
use League\CommonMark\Block\Element\ListBlock;
use League\CommonMark\Block\Element\ListData;
use League\CommonMark\Block\Element\ListItem;
use League\CommonMark\Block\Element\Paragraph;

function withoutFrontMatter(string $markdown): string {
    $parts = explode("\n---\n", $markdown);
    return $parts[1];
}

function withoutBacklinks(string $markdown): string {
    $startParts = explode("\n<!-- notaza backlinks start -->\n", $markdown, 2);
    $beforeStart = $startParts[0];
    $afterEnd = '';
    if (count($startParts) > 1) {
        $endParts = explode("\n<!-- notaza backlinks end -->\n", $startParts[1], 2);
        if (count($endParts) > 1) {
            $afterEnd = $endParts[1];
        }
    }
    return $beforeStart . $afterEnd;
}

function getTitle(string $markdown): ?string {
    $parts = explode("\n---\n", $markdown, 2);
    preg_match('/\ntitle: (.*)\n/', $parts[0], $matches);
    if ($matches[1]) {
        return $matches[1];
    } else {
        return null;
    }
}

function getLinkContext(Link $link): Node {
    $newLink = new Link($link->getUrl());
    $newLink->replaceChildren($link->children());
    return $newLink;
}

function updateBacklinks(string $id, string $markdown): string {
    $linksToThis = [];
    $linksFromThis = [];
    $files = getAllFiles();
    $environment = Environment::createCommonMarkEnvironment();
    $parser = new DocParser($environment);
    $htmlRenderer = new HtmlRenderer($environment);
    foreach ($files as $file) {
        if ($file["id"] !== $id) {
            $document = $parser->parse(withoutBacklinks(withoutFrontMatter($file["markdown"])));
            $walker = $document->walker();
            $inBacklinks = false;
            while ($event = $walker->next()) {
                if ($event->isEntering()) {
                    $node = $event->getNode();
                    if ($node instanceof Link && $node->getUrl() === "./" . $id . ".md" && !$inBacklinks) {
                        $linksToThis[$file["id"]] = $linksToThis[$file["id"]] ?? [
                            "title" => getTitle($file["markdown"]) ?? $file["id"],
                            "links" => [],
                        ];
                        $linksToThis[$file["id"]]["links"][] = getLinkContext($node);
                    }
                }
            }
        }
    }
    $newMarkdown = withoutBacklinks($markdown);
    $newMarkdown .= "\n<!-- notaza backlinks start -->\n";
    $newMarkdown .= "\n<h2>Backlinks</h2>\n\n";
    $backlinkListData = new ListData();
    $backlinkListData->bulletChar = '*';
    $backlinkListData->type = ListBlock::TYPE_BULLET;
    $backlinkListBlock = new ListBlock($backlinkListData);
    foreach ($linksToThis as $fromId => $data) {
        $mainLink = new Link("./" . $fromId . ".md", $data["title"]);
        $mainPara = new Paragraph();
        $mainPara->appendChild($mainLink);
        $mainItem = new ListItem($backlinkListData);
        $mainItem->appendChild($mainPara);

        $subBlock = new ListBlock($backlinkListData);
        foreach ($data["links"] as $subLink) {
            $subPara = new Paragraph();
            $subPara->appendChild($subLink);
            $subItem = new ListItem($backlinkListData);
            $subItem->appendChild($subPara);
            $subBlock->appendChild($subItem);
        }
        $mainItem->appendChild($subBlock);


        $backlinkListBlock->appendChild($mainItem);
    }
    $newMarkdown .= $htmlRenderer->renderBlock($backlinkListBlock);
    $newMarkdown .= "\n<!-- notaza backlinks end -->\n";
    var_dump($newMarkdown);
    return $newMarkdown;
}

function getAllFiles(): array {
    $dir = new DirectoryIterator(CONTENT_DIR);
    $files = [];
    foreach ($dir as $item) {
        if (!$item->isDot() && $item->isFile() && $item->getExtension() === "md" && strpos($item->getFilename(), "_") !== 0) {
            $files[] = [
                "id" => $item->getBasename(".md"),
                "markdown" => file_get_contents($item->getPathname()),
            ];
        }
    }
    return $files;
}

if ($url === "/api/pages" && $method === "GET") {
    echo json_encode([
        "success" => true,
        "data" => getAllFiles(),
    ]);
} else if ($url === "/api/pages" && $method === "PUT") {
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

    $withNewBacklinks = updateBacklinks($payload["id"], $payload["markdown"]);
    file_put_contents(CONTENT_DIR . "/" . $payload["id"] . ".md", $withNewBacklinks);
    echo json_encode([
        "success" => true,
        "data" => [
            "id" => $payload["id"],
            "markdown" => $withNewBacklinks,
        ]
    ]);
} else if ($method === "OPTIONS") {
    // Do nothing, needed for CORS
} else {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "error" => "Not found"
    ]);
}