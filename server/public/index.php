<?php

ini_set("display_errors", 1);
ini_set("display_startup_errors", 1);
error_reporting(E_ALL);

require_once "../vendor/autoload.php";
require_once "../config.php";

use League\CommonMark\DocParser;
use League\CommonMark\Environment;
use League\CommonMark\HtmlRenderer;
use League\CommonMark\Inline\Element\Link;
use League\CommonMark\Block\Element\ListBlock;
use League\CommonMark\Block\Element\ListData;
use League\CommonMark\Block\Element\ListItem;
use League\CommonMark\Block\Element\Paragraph;
use League\HTMLToMarkdown\HtmlConverter;
use League\CommonMark\Extension\Autolink\AutolinkExtension;
use League\CommonMark\CommonMarkConverter;


function toHtml(string $content): string {
    $environment = Environment::createCommonMarkEnvironment();
    $environment->addExtension(new AutolinkExtension());
    $converter = new CommonMarkConverter([], $environment);
    return $converter->convertToHtml($content);
}

set_error_handler(function($code, $description) {
    throw new Exception("Caught by error handler: " . $description);
});

class Page {
    public string $id;
    public string $frontMatter;
    public string $title;
    public string $content;
    public string $backlinks;
}

function parseUntil(array &$lines, string $until): string {
    $result = [];
    $line = array_shift($lines);
    while (is_string($line) && $line !== $until) {
        $result[] = $line;
        $line = array_shift($lines);
    }
    return implode("\n", $result);
}

function trimEmptyLines(array &$lines): void {
    while (isset($lines[0]) && $lines[0] === '') {
        array_shift($lines);
    }
}

const BACKLINKS_START = "<!-- notaza backlinks start -->";
const BACKLINKS_END = "<!-- notaza backlinks end -->";

function readPage(string $id, string $fileContents): ?Page {
    $page = new Page();
    $page->id = $id;
    $converted = str_replace("\r", "\n", str_replace("\r\n", "\n", $fileContents));
    $lines = explode("\n", $converted);
    if (array_shift($lines) !== '---') {
        return null;
    }
    $page->frontMatter = parseUntil($lines, '---');
    $frontMatter = yaml_parse("---\n" . $page->frontMatter . "\n...");
    if (!is_array($frontMatter)) {
        return null;
    }
    if (isset($frontMatter['title'])) {
        $page->title = $frontMatter['title'];
    } else {
        $page->title = $id;
    }
    trimEmptyLines($lines);
    $page->content = parseUntil($lines, BACKLINKS_START);
    trimEmptyLines($lines);
    $page->backlinks = parseUntil($lines, BACKLINKS_END);
    return $page;
}

function getPages(): array {
    $fileNames = scandir(DATA_DIR);
    $result = [];
    foreach ($fileNames as $fileName) {
        if (mb_substr($fileName, -3) === '.md') {
            $fileContents = file_get_contents(DATA_DIR . '/' . $fileName);
            if ($fileContents) {
                $page = readPage(mb_substr($fileName, 0, -3), $fileContents);
                if ($page) {
                    $result[] = $page;
                }
            }
        }
    }
    return $result;
}

function findPage(array $pages, string $id): ?Page {
    foreach ($pages as $page) {
        if ($page->id === $id) {
            return $page;
        }
    }
    return null;
}

function showPage(array $pages, Page $page, bool $edit): void {
    if ($edit) {
        $page->content = "---\n" . $page->frontMatter . "\n---\n\n" . $page->content;
    } else {
        $page->content = toHtml($page->content);
        $page->backlinks = toHtml($page->backlinks);
    }
    require_once '../templates/layout.php';
}

function isInternalUrl(string $url) {
    return mb_strpos($url, "./") === 0 && mb_substr($url, -3) === '.md';
}

function getLinkTargets(string $content): array {
    $environment = Environment::createCommonMarkEnvironment();
    $parser = new DocParser($environment);
    $document = $parser->parse($content);
    $walker = $document->walker();
    $result = [];
    while ($event = $walker->next()) {
        if ($event->isEntering()) {
            $node = $event->getNode();
            if ($node instanceof Link && isInternalUrl($node->getUrl())) {
                $result[] = mb_substr($node->getUrl(), 2, -3);
            }
        }
    }
    return $result;
}

function updateBacklinksSingle(Page $toUpdate, array $links): void {
    $listData = new ListData();
    $listData->bulletChar = '*';
    $listData->type = ListBlock::TYPE_BULLET;
    $backlinkListBlock = new ListBlock($listData);
    foreach ($links as [$from, $link]) {
        $mainLink = new Link("./" . $from->id . ".md", $from->title);

        $mainPara = new Paragraph();
        $mainPara->appendChild($mainLink);

        $subBlock = new ListBlock($listData);
        $subBlock->appendChild(getLinkContext($link));

        $mainItem = new ListItem($listData);
        $mainItem->appendChild($mainPara);
        $mainItem->appendChild($subBlock);

        $backlinkListBlock->appendChild($mainItem);
    }
    $environment = Environment::createCommonMarkEnvironment();
    $htmlRenderer = new HtmlRenderer($environment);
    $converter = new HtmlConverter();
    $converter->getConfig()->setOption('list_item_style', '*');

    $backlinksHtml = $htmlRenderer->renderBlock($backlinkListBlock);
    $backlinksMd = $converter->convert($backlinksHtml);
    $backlinksMdWithoutEmptyLines = implode("\n", array_filter(explode("\n", $backlinksMd), function (string $line): bool {
        return trim($line) !== '';
    }));

    $toUpdate->backlinks = $backlinksMdWithoutEmptyLines;
    writePage($toUpdate);
}

function getLinkContext(Link $link): ListItem {
    $parents = [];
    $parent = $link->parent();
    while ($parent) {
        array_unshift($parents, $parent);
        $parent = $parent->parent();
    }

    foreach ($parents as $parent) {
        if ($parent instanceof ListItem) {
            return $parent;
        }
    }

    $para = new Paragraph();
    $para->appendChild($link);
    $item = new ListItem($this->listData);
    $item->appendChild($para);
    return $item;
}

function getLinksByTarget(array $allPages): array {
    $linksByTarget = [];
    $environment = Environment::createCommonMarkEnvironment();
    $parser = new DocParser($environment);
    foreach ($allPages as $page) {
        $document = $parser->parse($page->content);
        $walker = $document->walker();
        while ($event = $walker->next()) {
            if ($event->isEntering()) {
                $node = $event->getNode();
                if ($node instanceof Link && isInternalUrl($node->getUrl())) {
                    $targetId = mb_substr($node->getUrl(), 2, - 3);
                    if (!isset($linksByTarget[$targetId])) {
                        $linksByTarget[$targetId] = [];
                    }
                    $linksByTarget[$targetId][] = [$page, $node];
                }
            }
        }
    }
    return $linksByTarget;
}

function updateBacklinks(array $allPages, Page $beforeUpdate, Page $updatedPage): void {
    $idsToUpdate = array_unique(array_merge(getLinkTargets($beforeUpdate->content), getLinkTargets($updatedPage->content)));
    $linksByTarget = getLinksByTarget($allPages);
    foreach ($idsToUpdate as $id) {
        $page = findPage($allPages, $id);
        if ($page instanceof Page) {
            updateBacklinksSingle($page, isset($linksByTarget[$id]) ? $linksByTarget[$id] : []);
        }
    }
}

function writePage(Page $page): void {
    file_put_contents(DATA_DIR . '/' . $page->id . '.md', implode("\n", [
        "---",
        $page->frontMatter,
        "---",
        "",
        $page->content,
        "",
        BACKLINKS_START,
        $page->backlinks,
        BACKLINKS_END,
        ""
    ]));
}

function savePage(array $pages, Page $page, string $content): void {
    $updated = readPage($page->id, $content);
    updateBacklinks($pages, $page, $updated);
    $page->frontMatter = $updated->frontMatter;
    $page->content = $updated->content;
    writePage($updated);
    header('Location: /p/' . $page->id);
}

$url = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
if (mb_strpos($url, '/static/') === 0) {
    return false;
} elseif ($url === '/') {
    header('Location: /p/' . date('Y-m-d'));
} elseif (mb_strpos($url, '/p/') === 0) {
    $pages = getPages();
    $id = mb_substr($url, mb_strlen('/p/'));
    $page = findPage($pages, $id);
    if ($page === null) {
        $page = new Page();
        $page->id = $id;
        $page->title = $id;
        $page->frontMatter = '';
        $page->content = "";
        $page->backlinks = "";
    }
    if (isset($_POST['content'])) {
        savePage($pages, $page, $_POST['content']);
    } else {
        showPage($pages, $page, isset($_GET['edit']));
    }
} else {
    echo 'not found';
}