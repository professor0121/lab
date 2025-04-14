<?php
/**
 * Plugin Name: Labely
 * Plugin URI: 
 * Description: A custom plugin for Labely functionality.
 * Version: 1.0.1
 * Author: Your Name
 * Author URI: https://www.linkedin.com/in/abhishek-kushwaha-5a3a49302/
 * License: GPL2
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Enqueue custom CSS and JS files.
// Enqueue external PDF.js and PDF-Lib libraries.
function labely_enqueue_scripts() {
    wp_enqueue_style( 'labely-style', plugin_dir_url( __FILE__ ) . 'assets/css/labely-style.css' );
    wp_enqueue_script( 'labely-script', plugin_dir_url( __FILE__ ) . 'assets/js/labely-script.js', array( 'jquery' ), null, true );
    wp_enqueue_script( 'pdfjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js', array(), null, true );
    wp_enqueue_script( 'pdflib', 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', array(), null, true );
}
add_action( 'wp_enqueue_scripts', 'labely_enqueue_scripts' );

 
// Shortcode to include the tools.php file.
function labely_include_tools() {
    ob_start();
    require_once plugin_dir_path( __FILE__ ) . 'inc/labely-tool.php';
    return ob_get_clean();
}
add_shortcode( 'labely_tools', 'labely_include_tools' );