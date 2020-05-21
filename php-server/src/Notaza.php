<?php

namespace Flammel\Notaza;

use League\CommonMark\DocParser;
use League\CommonMark\Environment;
use League\CommonMark\HtmlRenderer;
use League\CommonMark\Inline\Element\Link;
use League\CommonMark\Block\Element\ListBlock;
use League\CommonMark\Block\Element\ListData;
use League\CommonMark\Block\Element\ListItem;
use League\CommonMark\Block\Element\Paragraph;
use League\HTMLToMarkdown\HtmlConverter;


class Notaza
{
    private string $contentDir;
    private ListData $listData;

    public function __construct(string $contentDir)
    {
        $this->contentDir = $contentDir;
        $this->listData = new ListData();
        $this->listData->bulletChar = '*';
        $this->listData->type = ListBlock::TYPE_BULLET;
    }

    /**
     * @return File[]
     */
    public function getAllFiles(): array
    {
        $dir = new \DirectoryIterator($this->contentDir);
        $files = [];
        foreach ($dir as $item) {
            if (
                !$item->isDot()
                && $item->isFile()
                && $item->getExtension() === "md"
                && strpos($item->getFilename(), "_") !== 0
            ) {
                $files[] = new File($item->getBasename(".md"), file_get_contents($item->getPathname()));
            }
        }
        return $files;
    }

    /**
     * @return File
     */
    public function update(File $file): File
    {
        $withNewBacklinks = $this->updateBacklinks($file);
        file_put_contents($this->contentDir . "/" . $file->getId() . ".md", $withNewBacklinks);
        return new File($file->getId(), $withNewBacklinks);
    }

    public function refreshBacklinks(): void
    {
        $files = $this->getAllFiles();
        foreach ($files as $file) {
            $this->update($file);
        }
    }

    private function getLinkContext(Link $link): ListItem
    {
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

    private function updateBacklinks(File $updatingFile): string
    {
        $linksToThis = [];
        $files = $this->getAllFiles();
        $environment = Environment::createCommonMarkEnvironment();
        $parser = new DocParser($environment);
        $htmlRenderer = new HtmlRenderer($environment);
        foreach ($files as $file) {
            $fileId = $file->getId();
            if ($fileId !== $updatingFile->getId()) {
                $document = $parser->parse($file->withoutBacklinksAndFrontMatter());
                $walker = $document->walker();
                while ($event = $walker->next()) {
                    if ($event->isEntering()) {
                        $node = $event->getNode();
                        if ($node instanceof Link && $node->getUrl() === "./" . $updatingFile->getId() . ".md") {
                            $linksToThis[$fileId] = $linksToThis[$fileId] ?? [
                                "title" => $file->getTitle(),
                                "links" => [],
                            ];
                            $linksToThis[$fileId]["links"][] = $this->getLinkContext($node);
                        }
                    }
                }
            }
        }

        $backlinkListBlock = new ListBlock($this->listData);
        foreach ($linksToThis as $fromId => $data) {
            $mainLink = new Link("./" . $fromId . ".md", $data["title"]);
            $mainPara = new Paragraph();
            $mainPara->appendChild($mainLink);
            $mainItem = new ListItem($this->listData);
            $mainItem->appendChild($mainPara);
    
            $subBlock = new ListBlock($this->listData);
            foreach ($data["links"] as $linkItem) {
                $subBlock->appendChild($linkItem);
            }
            $mainItem->appendChild($subBlock);
            $backlinkListBlock->appendChild($mainItem);
        }
        $converter = new HtmlConverter();
        $converter->getConfig()->setOption('list_item_style', '*');

        $backlinksHtml = $htmlRenderer->renderBlock($backlinkListBlock);
        $backlinksMd = $converter->convert($backlinksHtml);
        $backlinksMdWithoutEmptyLines = implode("\n", array_filter(explode("\n", $backlinksMd), function (string $line): bool {
            return trim($line) !== '';
        }));

        $newMarkdown = $updatingFile->withoutBacklinks();
        $newMarkdown .= "\n<!-- notaza backlinks start -->\n\n## Backlinks\n\n";
        $newMarkdown .= $backlinksMdWithoutEmptyLines;
        $newMarkdown .= "\n\n<!-- notaza backlinks end -->\n";
        return $newMarkdown;
    }
}
