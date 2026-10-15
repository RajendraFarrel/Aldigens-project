<?php
$t=microtime(true);
try { $p = new PDO('mysql:host=127.0.0.1;port=3306;dbname=aldigens', 'root', '', [PDO::ATTR_TIMEOUT => 8, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]); echo 'CONNECTED ' . round(microtime(true)-$t,2) . PHP_EOL; $n = $p->query('SELECT COUNT(*) FROM users')->fetchColumn(); echo 'USERS=' . $n . PHP_EOL; } catch (Throwable $e) { echo 'ERR ' . $e->getMessage() . PHP_EOL; }
