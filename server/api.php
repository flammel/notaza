<?php

$contentDir = getenv('NOTAZA_CONTENT_DIR');

$files = [];
foreach (new DirectoryIterator($contentDir) as $file) {
    if ($file->isFile()) {
        $files[] = [
            'filename' => $file->getFilename(),
            'content' => str_replace("\r", "\n", str_replace("\r\n", "\n", file_get_contents($file->getRealPath()))),
        ];
    }
}

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
echo json_encode(['data' => $files]);