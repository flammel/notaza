<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Notaza - <?= $page->title ?></title>
    <link rel="stylesheet" href="/static/main.css">
</head>
<body>
    <div class="app">
        <div class="sidebar">
            <form class="sidebar__header">
                <a href="/">Today</a>
                <input placeholder="Search" />
            </form>
            <ul class="sidebar__list">
                <?php foreach ($pages as $current): ?>
                    <li class="search-result">
                        <a href="/p/<?= $current->id ?>">
                            <?= $current->title ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
            <form class="sidebar__footer">
                <button>Refresh Backlinks</button>
            </form>
        </div>
        <div class="page">
            <?php if ($edit): ?>
                <form method="post" action="/p/<?= $page->id ?>">
                    <textarea class="editor" name="content"><?= $page->content ?></textarea>
                    <button>Save</button>
                    <a href="/p/<?= $page->id ?>">Cancel</a>
                </form>
            <?php else: ?>
                <h1><?= $page->title ?></h1>
                <a href="/p/<?= $page->id ?>?edit" class="edit-button">edit</a>
                <?= $page->content ?>
                <h2>Backlinks</h2>
                <?= $page->backlinks ?>
            <?php endif; ?>
        </div>
    </div>
    <script src="/static/main.js"></script>
</body>
</html>