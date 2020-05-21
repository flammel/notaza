<?php

namespace Flammel\Notaza;

class File implements \JsonSerializable
{
    private string $id;
    private string $markdown;

    public function __construct(string $id, string $markdown)
    {
        $this->id = $id;
        $this->markdown = $markdown;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getMarkdown(): string
    {
        return $this->markdown;
    }

    public function getTitle(): ?string
    {
        $parts = explode("\n---\n", $this->markdown, 2);
        preg_match('/\ntitle: (.*)\n/', $parts[0], $matches);
        if ($matches[1]) {
            return $matches[1];
        } else {
            return $this->id;
        }
    }

    public function withoutBacklinksAndFrontMatter(): string
    {
        $parts = explode("\n---\n", $this->withoutBacklinks());
        return $parts[1];
    }

    public function withoutBacklinks(): string
    {
        $startParts = explode("\n<!-- notaza backlinks start -->\n", $this->markdown, 2);
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

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'markdown' => $this->markdown,
        ];
    }
}
