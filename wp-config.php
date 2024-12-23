<?php
/**
 * The base configurations of the WordPress.
 *
 * This file has the following configurations: MySQL settings, Table Prefix,
 * Secret Keys, WordPress Language, and ABSPATH. You can find more information
 * by visiting {@link http://codex.wordpress.org/Editing_wp-config.php Editing
 * wp-config.php} Codex page. You can get the MySQL settings from your web host.
 *
 * This file is used by the wp-config.php creation script during the
 * installation. You don't have to use the web site, you can just copy this file
 * to "wp-config.php" and fill in the values.
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define('DB_NAME', 'gorenfeld_net_1');

/** MySQL database username */
define('DB_USER', 'gorenfeldnet1');

/** MySQL database password */
define('DB_PASSWORD', '?vvduuy4');

/** MySQL hostname */
define('DB_HOST', 'mysql.gorenfeld.net');

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         'SMzs/v6~w+E:qn)K8OA!^yqsPH1L%~odQJ8b@Ds""n%u;P9)H:a`B2c2?z)uaa/k');
define('SECURE_AUTH_KEY',  'xh37Ax5"P69$B/k&3bOpD5REgQbAjYR`J3D2#z1Te:YZe8qnkUZm^LKOAngJfOv%');
define('LOGGED_IN_KEY',    'kcYWwmeMRYR(aAWdKg;fEXQ~k(O_J*wV0Ol)8M(SQ@?~QeBA^E`d2*mrzHx!*YiT');
define('NONCE_KEY',        '*ksG90MT7~DaYys$wGQM9oL~0)vWA&j9NKdxic/P4A06ZoT3xi&MP%(grESX~Eq+');
define('AUTH_SALT',        'VSNnnvyP?%X8$1UAi#^Kbi$edGpi5Q9vx|iI`eNHS/@4npd)DZRWGjXpIyZFv`06');
define('SECURE_AUTH_SALT', 'BUzb&$+Zl5hD@Y$*4?y4@&_Np&YdgVM23sW6CrwbWrW0CAXSLn~F&Ng#rUa)8|#H');
define('LOGGED_IN_SALT',   '?c2*B&w^"fBT1EzQ`!F+BL|UgQFT^XCz#g$@RUuKr6D?b%&/PdUcQ?j1/m^~kK#E');
define('NONCE_SALT',       'Hu"AFMDYT&mdvT""fNJSynw|Y#)`Sp9L0kVd3t+@m1adf"(~iBUmtAOak+y%75qE');

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each a unique
 * prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'wp_dk5h4m_';

/**
 * Limits total Post Revisions saved per Post/Page.
 * Change or comment this line out if you would like to increase or remove the limit.
 */
define('WP_POST_REVISIONS',  10);

/**
 * WordPress Localized Language, defaults to English.
 *
 * Change this to localize WordPress. A corresponding MO file for the chosen
 * language must be installed to wp-content/languages. For example, install
 * de_DE.mo to wp-content/languages and set WPLANG to 'de_DE' to enable German
 * language support.
 */
define('WPLANG', '');

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 */
define('WP_DEBUG', false);

/**
 * Removing this could cause issues with your experience in the DreamHost panel
 */

if (isset($_SERVER['HTTP_HOST']) && preg_match("/^(.*)\.dream\.website$/", $_SERVER['HTTP_HOST'])) {
        $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
        define('WP_SITEURL', $proto . '://' . $_SERVER['HTTP_HOST']);
        define('WP_HOME',    $proto . '://' . $_SERVER['HTTP_HOST']);
}

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');

