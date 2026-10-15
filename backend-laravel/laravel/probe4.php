<?php
file_put_contents(__DIR__ . '/probe4.txt', "START\n");
try {
    $m = @mysqli_connect('127.0.0.1', 'root', '', 'aldigens', 3306);
    if ($m) {
        file_put_contents(__DIR__ . '/probe4.txt', "MYSQLI_OK\n", FILE_APPEND);
        $r = @mysqli_query($m, 'SHOW DATABASES');
        while ($row = mysqli_fetch_row($r)) {
            file_put_contents(__DIR__ . '/probe4.txt', "DB: " . $row[0] . "\n", FILE_APPEND);
        }
    } else {
        file_put_contents(__DIR__ . '/probe4.txt', 'MYSQLI_ERR: ' . mysqli_connect_error() . "\n", FILE_APPEND);
    }
} catch (Throwable $e) {
    file_put_contents(__DIR__ . '/probe4.txt', 'EXC: ' . $e->getMessage() . "\n", FILE_APPEND);
}
file_put_contents(__DIR__ . '/probe4.txt', "END\n", FILE_APPEND);
